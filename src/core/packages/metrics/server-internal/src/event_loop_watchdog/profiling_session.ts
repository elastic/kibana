/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import v8 from 'node:v8';
import type { Logger } from '@kbn/logging';
import {
  MAX_SESSION_MS,
  MIN_FLAGGED_WINDOW_MS,
  SAMPLING_INTERVAL_US,
  V8_DEFAULT_SAMPLING_INTERVAL_US,
  WINDOW_MS,
} from './types';

/** A running V8 CPU profile. */
export interface CpuProfileHandle {
  /** Stops the profile, returning it as `.cpuprofile` JSON. */
  stop(): string;
}

/** Starts CPU profiles of the calling thread; overlapping profiles share one live profiler. */
export interface CpuProfiler {
  start(): CpuProfileHandle;
}

/** `v8.startCpuProfile` (Node.js 24.12+) is newer than the installed `@types/node`. */
const nodeV8 = v8 as typeof v8 & { startCpuProfile(): CpuProfileHandle };

/**
 * Node's per-thread V8 CPU profiler (`v8.startCpuProfile`), driven from userland: no native module
 * or inspector session. Its sampling interval is V8's global flag when the profiler is created (on
 * the first start), so the flag is set for that start only: profilers created later are unaffected.
 */
export const createV8CpuProfiler = (): CpuProfiler => {
  let created = false;
  return {
    start: () => {
      if (created) return nodeV8.startCpuProfile();
      v8.setFlagsFromString(`--cpu-profiler-sampling-interval=${SAMPLING_INTERVAL_US}`);
      try {
        const handle = nodeV8.startCpuProfile();
        created = true;
        return handle;
      } finally {
        v8.setFlagsFromString(
          `--cpu-profiler-sampling-interval=${V8_DEFAULT_SAMPLING_INTERVAL_US}`
        );
      }
    },
  };
};

export interface ProfileWindow {
  startUs: number;
  endUs: number;
}

export interface KeptProfile {
  /** The window's profile, `.cpuprofile` JSON. */
  json: string;
  /** Monotonic time right after the profile was stopped, to map V8's clock onto `hrtime`. */
  stoppedAtUs: number;
  window: ProfileWindow;
  /** Windows kept in the session so far, including this one. */
  kept: number;
}

export interface SessionLimits {
  windowMs: number;
  minFlaggedWindowMs: number;
  maxSessionMs: number;
}

export const DEFAULT_LIMITS: SessionLimits = {
  windowMs: WINDOW_MS,
  minFlaggedWindowMs: MIN_FLAGGED_WINDOW_MS,
  maxSessionMs: MAX_SESSION_MS,
};

export interface ProfilingSessionParams {
  profiler: CpuProfiler;
  limits?: SessionLimits;
  logger: Logger;
  /** Process-wide monotonic clock, in microseconds. */
  now(): number;
  /** Publishes rotation boundaries so that stalls they cause are not reported as blocks. */
  markRotation(phase: 'start' | 'end', atUs: number): void;
  onKeep(profile: KeptProfile): void;
}

/**
 * Samples the main thread continuously in rotating windows, keeping only windows the watchdog
 * flagged as containing a block. Each rotation starts the next profile before stopping the current
 * one, so sampling never pauses and the profiler's cold start (enumerating all compiled code) is
 * paid once per session. Bounded by {@link MAX_SESSION_MS}; the worker bounds the files written.
 */
export class ProfilingSession {
  private current?: CpuProfileHandle;
  private startedAt = 0;
  private windowStartedAt = 0;
  private lastBlockCount = 0;
  private flagged = false;
  private kept = 0;
  private readonly limits: SessionLimits;

  constructor(private readonly params: ProfilingSessionParams) {
    this.limits = params.limits ?? DEFAULT_LIMITS;
  }

  public get isActive(): boolean {
    return this.current !== undefined;
  }

  public start(blockCount: number): void {
    const { profiler, logger, now, markRotation } = this.params;
    // The cold start pauses the main thread like a rotation could (V8 enumerates all code).
    const startingAt = now();
    markRotation('start', startingAt);
    try {
      this.current = profiler.start();
    } finally {
      markRotation('end', now());
    }
    this.startedAt = this.windowStartedAt = now();
    this.lastBlockCount = blockCount;
    const { windowMs, maxSessionMs } = this.limits;
    logger.info(
      `Event loop profiling started (${Math.round(1e6 / SAMPLING_INTERVAL_US)}Hz, ${
        windowMs / 1000
      }s windows, max ${maxSessionMs / 60_000}min; start took ${Math.round(
        (this.startedAt - startingAt) / 1000
      )}ms)`
    );
  }

  /** Called every heartbeat with the watchdog's running count of (non-profiler) blocks. */
  public tick(blockCount: number): void {
    if (!this.current) return;
    const now = this.params.now();
    if (blockCount !== this.lastBlockCount) {
      this.lastBlockCount = blockCount;
      this.flagged = true;
    }
    const { maxSessionMs, windowMs, minFlaggedWindowMs } = this.limits;
    if (now - this.startedAt >= maxSessionMs * 1000) {
      if (this.flagged) this.rotate(); // keep a last flagged window before ending
      return this.end('time limit reached');
    }
    const windowAge = now - this.windowStartedAt;
    if (windowAge >= windowMs * 1000 || (this.flagged && windowAge >= minFlaggedWindowMs * 1000)) {
      this.rotate();
    }
  }

  public end(reason: string): void {
    const { current } = this;
    if (!current) return;
    this.current = undefined;
    const { now, markRotation, logger } = this.params;
    markRotation('start', now());
    try {
      current.stop();
    } catch (error) {
      logger.warn(`Failed to stop the event loop profiler: ${error.message}`);
    } finally {
      markRotation('end', now());
    }
    logger.info(`Event loop profiling ended (${reason}); kept ${this.kept} profiles`);
  }

  private rotate(): void {
    const { profiler, now, markRotation, onKeep } = this.params;
    const current = this.current;
    if (!current) return;
    const keep = this.flagged;
    this.flagged = false;
    const startUs = now();
    markRotation('start', startUs);
    let json: string;
    let stoppedAtUs: number;
    try {
      // Overlap: the next profile starts while the current one still runs (no cold start, no gap).
      this.current = profiler.start();
      json = current.stop();
      stoppedAtUs = now();
    } catch (error) {
      // `current` is whichever profile still runs (the old one if the next failed to start)
      return this.end(`rotation failed: ${error.message}`);
    } finally {
      markRotation('end', now());
    }
    const window = { startUs: this.windowStartedAt, endUs: startUs };
    this.windowStartedAt = startUs;
    if (!keep) return;
    onKeep({ json, stoppedAtUs, window, kept: ++this.kept });
  }
}
