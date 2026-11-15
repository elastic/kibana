/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Phase } from './types';

export interface AdmissionLimits {
  /** Files allowed per phase in the rolling hour before a capture must be a record to be written. */
  perHour: number;
  /** Factor by which a block must exceed the longest written in its phase to be a record. */
  minGrowth: number;
  /** Upper limit on files written over the worker's lifetime, startup files included. */
  maxFiles: number;
  /** Length of the rolling hour, in the worker's monotonic milliseconds. */
  rollingHourMs: number;
}

export const ADMISSION_LIMITS: Readonly<AdmissionLimits> = {
  perHour: 5,
  minGrowth: 1.25,
  maxFiles: 100,
  rollingHourMs: 60 * 60 * 1000,
};

export type AdmissionOutcome = 'written' | 'in_window' | 'file_limit';

interface PhaseState {
  /** Monotonic times of this phase's newest writes in the rolling hour, at most `perHour`. */
  writeTimes: number[];
  longestWrittenMs: number;
}

/**
 * Decides which captures are written to the diagnostics directory. Files there may be uploaded and
 * deleted at any time, so a written file is never replaced: a capture is written if its phase wrote
 * fewer than `perHour` files in the rolling hour, or its block is a record (`minGrowth` times the
 * longest block its phase wrote). `maxFiles` is an upper limit on the rest.
 *
 * `admit` has no side effects; the caller calls `recordWritten` once the file is written, so a
 * failed write uses none of the allowance. Times are the worker's monotonic milliseconds, so the
 * rolling hour is immune to wall-clock steps.
 */
export class WriteAdmission {
  private readonly phases: Record<Phase, PhaseState> = {
    starting: { writeTimes: [], longestWrittenMs: 0 },
    running: { writeTimes: [], longestWrittenMs: 0 },
  };
  private written = 0;

  constructor(private readonly limits: Readonly<AdmissionLimits> = ADMISSION_LIMITS) {}

  /** Decides whether a capture in `phase` whose block lasted `blockedMs` is written at `nowMs`. */
  public admit(phase: Phase, blockedMs: number, nowMs: number): AdmissionOutcome {
    const { perHour, minGrowth, maxFiles } = this.limits;
    if (this.written >= maxFiles) {
      return 'file_limit';
    }
    const { longestWrittenMs } = this.phases[phase];
    if (this.writeTimesInRollingHour(phase, nowMs).length < perHour) {
      return 'written';
    }
    return blockedMs > longestWrittenMs * minGrowth ? 'written' : 'in_window';
  }

  /** Records a written capture; call only once its file is written. */
  public recordWritten(phase: Phase, blockedMs: number, nowMs: number): void {
    const state = this.phases[phase];
    // The newest `perHour` times are enough to tell whether `perHour` writes fall in the hour.
    state.writeTimes = [...this.writeTimesInRollingHour(phase, nowMs), nowMs].slice(
      -this.limits.perHour
    );
    state.longestWrittenMs = Math.max(state.longestWrittenMs, blockedMs);
    this.written++;
  }

  private writeTimesInRollingHour(phase: Phase, nowMs: number): number[] {
    const from = nowMs - this.limits.rollingHourMs;
    return this.phases[phase].writeTimes.filter((time) => time > from);
  }
}
