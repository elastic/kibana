/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import type { Readable } from 'stream';
import stripAnsi from 'strip-ansi';
import { pollUntilHttpReady } from './ready_check';
import type { LogLine, ProcessDefinition, ProcessState, ProcessStatus } from './types';

const DEFAULT_READY_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_STOP_TIMEOUT_MS = 30 * 1000;

export interface ManagedProcessCallbacks {
  readonly onChange: (status: ProcessStatus) => void;
  readonly onLine: (line: LogLine) => void;
}

interface ReadyWaiter {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

const GROUP_POLL_MS = 100;
// How long to wait for the process group to go away after SIGKILL.
const KILL_GRACE_MS = 5 * 1000;

const isTerminal = (state: ProcessState): boolean =>
  state === 'stopped' || state === 'exited' || state === 'failed';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Whether any process in the group led by `pid` is alive; always false on Windows, which has no process groups. */
const isGroupAlive = (pid: number): boolean => {
  if (process.platform === 'win32') {
    return false;
  }
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

/** Resolves true once the process group led by `pid` is gone, or false at `deadline`. */
const waitForGroupExit = async (pid: number, deadline: number): Promise<boolean> => {
  while (isGroupAlive(pid)) {
    if (Date.now() >= deadline) {
      return false;
    }
    await delay(GROUP_POLL_MS);
  }
  return true;
};

/** Runs one process: spawns it in its own process group, logs its output to a file and tracks its readiness. */
export class ManagedProcess {
  private status: ProcessStatus;
  private child?: ChildProcess;
  private closed: Promise<void> = Promise.resolve();
  private readiness?: AbortController;
  private readyWaiters: ReadyWaiter[] = [];

  constructor(
    private readonly definition: ProcessDefinition,
    logFile: string,
    private readonly callbacks: ManagedProcessCallbacks
  ) {
    this.status = { id: definition.id, state: 'stopped', logFile };
  }

  public getStatus(): ProcessStatus {
    return this.status;
  }

  public isRunning(): boolean {
    return this.child !== undefined;
  }

  /** Resolves once the process is ready; rejects when it ends or fails before that. */
  public whenReady(): Promise<void> {
    const { state, error } = this.status;
    if (state === 'ready') {
      return Promise.resolve();
    }
    if (isTerminal(state)) {
      return Promise.reject(
        new Error(`${this.definition.id} is ${state}${error ? `: ${error}` : ''}`)
      );
    }
    return new Promise((resolve, reject) => {
      this.readyWaiters.push({ resolve, reject });
    });
  }

  public markWaiting(): void {
    this.update({ state: 'waiting', error: undefined });
  }

  public markFailed(error: string): void {
    this.update({ state: 'failed', error });
  }

  public start(): void {
    if (this.child) {
      return;
    }
    const { command, cwd, env, ready, readyTimeoutMs } = this.definition;
    const args =
      typeof this.definition.args === 'function' ? this.definition.args() : this.definition.args;
    const logStream = fs.createWriteStream(this.status.logFile, { flags: 'a' });
    logStream.write(`\n--- ${new Date().toISOString()} starting: ${command} ${args.join(' ')}\n`);

    const child = spawn(command, [...args], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      // A process group of its own lets stop() reach the grandchildren, e.g. the Elasticsearch JVM.
      detached: process.platform !== 'win32',
    });
    this.child = child;
    this.update({
      state: 'starting',
      pid: child.pid,
      exitCode: undefined,
      signal: undefined,
      startedAt: new Date().toISOString(),
      readyAt: undefined,
      error: undefined,
    });

    const readiness = new AbortController();
    this.readiness = readiness;

    const pipeLines = (stream: Readable, name: LogLine['stream']) => {
      readline.createInterface({ input: stream, crlfDelay: Infinity }).on('line', (raw) => {
        logStream.write(`${raw}\n`);
        const text = stripAnsi(raw);
        this.callbacks.onLine({
          processId: this.definition.id,
          stream: name,
          text,
          time: Date.now(),
        });
        if (ready.type === 'log' && this.status.state === 'starting' && ready.pattern.test(text)) {
          this.markReady();
        }
      });
    };
    if (child.stdout) pipeLines(child.stdout, 'stdout');
    if (child.stderr) pipeLines(child.stderr, 'stderr');

    const timeoutMs = readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
    const readyTimer = setTimeout(() => {
      if (this.child === child && this.status.state === 'starting') {
        readiness.abort();
        this.markFailed(`not ready after ${timeoutMs / 1000}s`);
      }
    }, timeoutMs);

    this.closed = new Promise((resolve) => {
      const finish = (fields: Partial<ProcessStatus>) => {
        if (this.child !== child) {
          return;
        }
        this.child = undefined;
        readiness.abort();
        clearTimeout(readyTimer);
        if (this.status.state === 'stopping') {
          // stop() marks the process stopped once the rest of its process group has exited too.
          this.update({ exitCode: fields.exitCode, signal: fields.signal });
          logStream.end(`--- ${new Date().toISOString()} stopped\n`);
        } else {
          const state: ProcessState = fields.state ?? 'exited';
          this.update({ ...fields, state });
          logStream.end(`--- ${new Date().toISOString()} ${state}\n`);
        }
        resolve();
      };
      child.on('error', (error) => finish({ state: 'failed', error: error.message }));
      child.on('close', (exitCode, signal) =>
        finish({
          exitCode,
          signal,
          ...(exitCode === 0
            ? { state: 'exited' }
            : { state: 'failed', error: `exited with ${signal ?? `code ${exitCode}`}` }),
        })
      );
    });

    if (ready.type === 'spawned') {
      this.markReady();
    } else if (ready.type === 'http') {
      void pollUntilHttpReady(ready, readiness.signal).then((isReady) => {
        if (isReady && this.child === child && this.status.state === 'starting') {
          this.markReady();
        }
      });
    }
  }

  /**
   * Stops the process group with SIGTERM, then SIGKILL after the stop timeout. Resolves once every process in the
   * group has exited: the direct child can exit before its own children, like the Elasticsearch JVM.
   */
  public async stop(): Promise<void> {
    const { child } = this;
    if (!child) {
      if (!isTerminal(this.status.state)) {
        this.update({ state: 'stopped', error: undefined });
      }
      return;
    }
    const { pid } = child;
    this.readiness?.abort();
    this.update({ state: 'stopping' });
    this.signal(child, 'SIGTERM');
    const deadline = Date.now() + (this.definition.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS);
    const killTimer = setTimeout(() => this.signal(child, 'SIGKILL'), deadline - Date.now());
    await this.closed;
    clearTimeout(killTimer);

    if (pid !== undefined && !(await waitForGroupExit(pid, deadline))) {
      this.signal(child, 'SIGKILL');
      await waitForGroupExit(pid, Date.now() + KILL_GRACE_MS);
    }
    // start() may have run again while this was waiting for the process group.
    if (!this.child) {
      this.update({ state: 'stopped', error: undefined });
    }
  }

  /** Signals the process group without waiting, for exit handlers that cannot await. */
  public signalGroup(signal: NodeJS.Signals): void {
    if (this.child) {
      this.update({ state: 'stopping' });
      this.signal(this.child, signal);
    }
  }

  private signal(child: ChildProcess, signal: NodeJS.Signals): void {
    const { pid } = child;
    if (pid === undefined) {
      return;
    }
    try {
      if (process.platform === 'win32') {
        child.kill(signal);
      } else {
        process.kill(-pid, signal);
      }
    } catch {
      // The process group is already gone.
    }
  }

  private markReady(): void {
    this.update({ state: 'ready', readyAt: new Date().toISOString() });
  }

  private update(fields: Partial<ProcessStatus>): void {
    this.status = { ...this.status, ...fields };
    const { state } = this.status;
    if (state === 'ready' || isTerminal(state)) {
      const waiters = this.readyWaiters;
      this.readyWaiters = [];
      const error = new Error(
        `${this.definition.id} is ${state}${this.status.error ? `: ${this.status.error}` : ''}`
      );
      waiters.forEach(({ resolve, reject }) => (state === 'ready' ? resolve() : reject(error)));
    }
    this.callbacks.onChange(this.status);
  }
}
