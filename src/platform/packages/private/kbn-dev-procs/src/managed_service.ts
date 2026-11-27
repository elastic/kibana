/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { isTerminal, Runner } from './base_runner';
import type { RunnerCallbacks } from './base_runner';
import type { ServiceDefinition, ServiceHandle } from './types';

/** Runs a service inside the supervisor, such as the MCP server, with the same states and log file as a process. */
export class ManagedService extends Runner {
  private handle?: ServiceHandle;
  private starting?: Promise<void>;
  private logStream?: fs.WriteStream;

  constructor(
    private readonly definition: ServiceDefinition,
    logFile: string,
    callbacks: RunnerCallbacks
  ) {
    super(definition.id, logFile, callbacks);
  }

  public isRunning(): boolean {
    return this.handle !== undefined || this.starting !== undefined;
  }

  public start(): void {
    if (this.isRunning()) {
      return;
    }
    const logStream = fs.createWriteStream(this.status.logFile, { flags: 'a' });
    this.logStream = logStream;
    logStream.write(`\n--- ${new Date().toISOString()} starting\n`);
    this.update({
      state: 'starting',
      startedAt: new Date().toISOString(),
      readyAt: undefined,
      error: undefined,
      exitCode: undefined,
      signal: undefined,
    });
    const log = (text: string) => {
      logStream.write(`${text}\n`);
      this.callbacks.onLine({ processId: this.id, stream: 'stdout', text, time: Date.now() });
    };
    this.starting = this.definition.run({ log }).then(
      (handle) => {
        this.handle = handle;
        this.starting = undefined;
        this.update({ url: handle.url });
        this.markReady();
      },
      (error: Error) => {
        this.starting = undefined;
        log(error.message);
        this.update({ state: 'failed', error: error.message });
        logStream.end(`--- ${new Date().toISOString()} failed\n`);
      }
    );
  }

  public async stop(): Promise<void> {
    await this.starting;
    const { handle } = this;
    if (!handle) {
      if (!isTerminal(this.status.state)) {
        this.update({ state: 'stopped', error: undefined });
      }
      return;
    }
    this.update({ state: 'stopping' });
    try {
      await handle.stop();
    } finally {
      this.handle = undefined;
      this.update({ state: 'stopped', error: undefined, url: undefined });
      this.logStream?.end(`--- ${new Date().toISOString()} stopped\n`);
    }
  }

  public signalGroup(): void {
    // It runs inside the supervisor, so it ends with it.
  }
}
