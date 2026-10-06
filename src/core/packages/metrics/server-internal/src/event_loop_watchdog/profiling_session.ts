/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { Logger } from '@kbn/logging';
import {
  INNER_CONTEXT_LABEL,
  MAX_KEPT_PROFILES,
  MAX_SESSION_MS,
  MIN_FLAGGED_WINDOW_MS,
  OUTER_CONTEXT_LABEL,
  SAMPLING_INTERVAL_US,
  TIMESTAMP_LABEL,
  WINDOW_MS,
} from './types';

export type PprofTime = Pick<
  typeof import('@datadog/pprof')['time'],
  'start' | 'stop' | 'runWithContext'
>;
export type PprofProfile = ReturnType<PprofTime['stop']>;
type GenerateLabels = NonNullable<Parameters<PprofTime['stop']>[1]>;

export interface ProfileWindow {
  startUs: number;
  endUs: number;
}

export interface SessionLimits {
  windowMs: number;
  minFlaggedWindowMs: number;
  maxSessionMs: number;
  maxKeptProfiles: number;
}

export const DEFAULT_LIMITS: SessionLimits = {
  windowMs: WINDOW_MS,
  minFlaggedWindowMs: MIN_FLAGGED_WINDOW_MS,
  maxSessionMs: MAX_SESSION_MS,
  maxKeptProfiles: MAX_KEPT_PROFILES,
};

export interface ProfilingSessionParams {
  time: PprofTime;
  limits?: SessionLimits;
  logger: Logger;
  /** Process-wide monotonic clock, in microseconds. */
  now(): number;
  /** Publishes rotation boundaries so that stalls they cause are not reported as blocks. */
  markRotation(phase: 'start' | 'end', atUs: number): void;
  /** `kept` reads e.g. `3/100`. */
  onKeep(profile: PprofProfile, window: ProfileWindow, kept: string): void;
}

const LOW_CARDINALITY_LABELS = [OUTER_CONTEXT_LABEL, INNER_CONTEXT_LABEL];

const describe = ({ type, name }: KibanaExecutionContext): string | undefined =>
  type || name ? `${type ?? ''}:${name ?? ''}` : undefined;

/** Outermost and innermost execution context as profiler labels; never ids (cardinality). */
export const toLabels = (context: KibanaExecutionContext): Record<string, string> => {
  let inner: KibanaExecutionContext | undefined;
  for (let child = context.child; child; child = child.child) inner = child;
  const labels: Record<string, string> = {};
  const outer = describe(context);
  if (outer) labels[OUTER_CONTEXT_LABEL] = outer;
  const innerLabel = inner && describe(inner);
  if (innerLabel) labels[INNER_CONTEXT_LABEL] = innerLabel;
  return labels;
};

const generateLabels: GenerateLabels = ({ context }) =>
  context
    ? {
        ...(context.context as Record<string, string> | undefined),
        [TIMESTAMP_LABEL]: Number(context.timestamp),
      }
    : {};

/**
 * Samples the main thread continuously in rotating windows, keeping only windows the watchdog
 * flagged as containing a block. Bounded by {@link MAX_SESSION_MS} and {@link MAX_KEPT_PROFILES}.
 */
export class ProfilingSession {
  private active = false;
  private labelsEnabled = false;
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
    return this.active;
  }

  public start(blockCount: number, details = ''): void {
    const { time, logger, now } = this.params;
    time.start({
      intervalMicros: SAMPLING_INTERVAL_US,
      withContexts: true,
      useCPED: true,
      lineNumbers: false,
    });
    this.active = true;
    this.startedAt = this.windowStartedAt = now();
    this.lastBlockCount = blockCount;
    try {
      // Labels need AsyncContextFrame (Node 24 default); without it this throws.
      time.runWithContext({}, () => {});
      this.labelsEnabled = true;
    } catch (error) {
      logger.warn(`Event loop profiling continues without labels: ${error.message}`);
    }
    const { windowMs, maxSessionMs, maxKeptProfiles } = this.limits;
    logger.info(
      `Event loop profiling started (${Math.round(1e6 / SAMPLING_INTERVAL_US)}Hz, ${
        windowMs / 1000
      }s windows, max ${maxSessionMs / 60_000}min or ${maxKeptProfiles} profiles${details})`
    );
  }

  /** Called every heartbeat with the watchdog's running count of (non-profiler) blocks. */
  public tick(blockCount: number): void {
    if (!this.active) return;
    const now = this.params.now();
    if (blockCount !== this.lastBlockCount) {
      this.lastBlockCount = blockCount;
      this.flagged = true;
    }
    const { maxSessionMs, windowMs, minFlaggedWindowMs } = this.limits;
    if (now - this.startedAt >= maxSessionMs * 1000) {
      return this.end(`time limit reached`);
    }
    const windowAge = now - this.windowStartedAt;
    if (windowAge >= windowMs * 1000 || (this.flagged && windowAge >= minFlaggedWindowMs * 1000)) {
      this.rotate();
    }
  }

  public runWithLabels<R>(context: KibanaExecutionContext, run: () => R): R {
    if (!this.active || !this.labelsEnabled) return run();
    return this.params.time.runWithContext(toLabels(context), run);
  }

  public end(reason: string): void {
    if (!this.active) return;
    this.active = false;
    try {
      this.params.time.stop(false);
    } catch (error) {
      this.params.logger.warn(`Failed to stop the event loop profiler: ${error.message}`);
    }
    this.params.logger.info(
      `Event loop profiling ended (${reason}); kept ${this.kept}/${this.limits.maxKeptProfiles} profiles`
    );
  }

  private rotate(): void {
    const { time, now, markRotation, onKeep } = this.params;
    const keep = this.flagged;
    this.flagged = false;
    const startUs = now();
    markRotation('start', startUs);
    let profile: PprofProfile;
    try {
      profile = time.stop(true, keep ? generateLabels : undefined, LOW_CARDINALITY_LABELS);
    } catch (error) {
      return this.end(`rotation failed: ${error.message}`);
    } finally {
      markRotation('end', now());
    }
    const window = { startUs: this.windowStartedAt, endUs: startUs };
    this.windowStartedAt = startUs;
    if (!keep) return;
    this.kept++;
    onKeep(profile, window, `${this.kept}/${this.limits.maxKeptProfiles}`);
    if (this.kept >= this.limits.maxKeptProfiles) this.end('profile limit reached');
  }
}
