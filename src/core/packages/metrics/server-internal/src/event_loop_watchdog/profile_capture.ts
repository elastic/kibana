/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session } from 'node:inspector/promises';
import { SAMPLING_INTERVAL_US } from './constants';

/** The parts of a V8 CPU profile (`Profiler.Profile`) the watchdog reads. */
export interface CpuProfile {
  nodes: ReadonlyArray<{ id: number; callFrame: { functionName: string } }>;
  /** Microseconds; when profiling was requested, before the first sample. */
  startTime: number;
  endTime: number;
  samples?: readonly number[];
  /** Microseconds between samples; the first is measured from `startTime`. */
  timeDeltas?: readonly number[];
}

/** The inspector session calls a capture makes; injectable for tests. */
export interface InspectorSession {
  connectToMainThread(): void;
  post(method: 'Profiler.stop'): Promise<{ profile: CpuProfile }>;
  post(method: string, params?: object): Promise<unknown>;
  disconnect(): void;
}

export const createInspectorSession = (): InspectorSession => new Session() as InspectorSession;

/**
 * One CPU profile of the main thread, taken from the worker. Inspector commands run on the main
 * thread through V8 interrupts, so the profile starts and stops while the main thread is blocked.
 */
export class ProfileCapture {
  private readonly session: InspectorSession;
  private disposed = false;

  constructor(createSession: () => InspectorSession) {
    this.session = createSession();
    this.session.connectToMainThread();
  }

  /** Starts the profiler; resolves once it's sampling. Posted together, so one round trip. */
  public async start(): Promise<void> {
    await Promise.all([
      this.session.post('Profiler.enable'),
      this.session.post('Profiler.setSamplingInterval', {
        interval: SAMPLING_INTERVAL_US,
      }),
      this.session.post('Profiler.start'),
    ]);
  }

  /** Stops the profiler and ends the session; resolves with the samples so far. */
  public async stop(): Promise<CpuProfile> {
    try {
      const { profile } = await this.session.post('Profiler.stop');
      return profile;
    } finally {
      this.dispose();
    }
  }

  /** Ends the session without waiting; this also stops a running profile. */
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.session.disconnect();
  }
}
