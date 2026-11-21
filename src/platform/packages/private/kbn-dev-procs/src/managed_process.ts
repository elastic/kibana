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
import { isTerminal, Runner } from './base_runner';
import type { RunnerCallbacks } from './base_runner';
import { pollUntilHttpReady } from './ready_check';
import type { LogLine, ProcessDefinition, ProcessState, ProcessStatus } from './types';

const DEFAULT_READY_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_STOP_TIMEOUT_MS = 30 * 1000;

const GROUP_POLL_MS = 100;
// How long to wait for the process group to go away after SIGKILL.
const KILL_GRACE_MS = 5 * 1000;

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
export class ManagedProcess extends Runner {
  private child?: ChildProcess;
  private closed: Promise<void> = Promise.resolve();
  private readiness?: AbortController;
  /** The index in urlPatterns of the pattern that found the current URL. */
  private urlPriority?: number;

  constructor(
    private readonly definition: ProcessDefinition,
    logFile: string,
    callbacks: RunnerCallbacks
  ) {
    super(definition.id, logFile, callbacks);
  }

  /** Takes the URL from a log line that announces it, unless a more useful pattern found one already. */
  private readUrl(text: string): void {
    const { urlPatterns = [] } = this.definition;
    for (let index = 0; index < urlPatterns.length; index++) {
      if (this.urlPriority !== undefined && this.urlPriority < index) {
        return;
      }
      const url = urlPatterns[index].exec(text)?.[1];
      if (url) {
        this.urlPriority = index;
        if (url !== this.status.url) {
          this.update({ url });
        }
        return;
      }
    }
  }

  public isRunning(): boolean {
    return this.child !== undefined;
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
      url: this.definition.url,
    });

    this.urlPriority = undefined;
    const readiness = new AbortController();
    this.readiness = readiness;

    const pipeLines = (stream: Readable, name: LogLine['stream']) => {
      readline.createInterface({ input: stream, crlfDelay: Infinity }).on('line', (raw) => {
        const text = stripAnsi(raw);
        // The log file stays plain text, for grep, less and agents reading it.
        logStream.write(`${text}\n`);
        this.callbacks.onLine({
          processId: this.definition.id,
          stream: name,
          text,
          ...(raw !== text ? { raw } : {}),
          time: Date.now(),
        });
        this.readUrl(text);
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
          // The process ended by itself, but its children may live on, like the Elasticsearch JVM when the
          // wrapper script dies. Nothing would stop them later, as the process counts as ended.
          if (child.pid !== undefined && isGroupAlive(child.pid)) {
            this.signal(child, 'SIGTERM');
          }
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
}
