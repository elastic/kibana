/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADMISSION_LIMITS, ROLLING_HOUR_MS } from './constants';
import type { Phase } from './types';

export interface AdmissionLimits {
  /** Files allowed in the phase's rolling hour before a capture must be a record to be written. */
  perHour: number;
  /** Factor by which a block must exceed the longest its phase wrote to be a record. */
  minGrowth: number;
  /** Upper limit on files the phase writes over the worker's lifetime. */
  maxFiles: number;
}

export type AdmissionOutcome = 'admitted' | 'in_window' | 'file_limit';

interface PhaseState {
  /** Monotonic times of the phase's newest admissions in the rolling hour, at most `perHour`. */
  admittedTimes: number[];
  longestAdmittedMs: number;
  admitted: number;
}

/**
 * Decides which captures are written to the diagnostics directory. Files there may be uploaded and
 * deleted at any time, so a written file is never replaced. Each phase has its own limits and
 * state: a capture is admitted if its phase admitted fewer than `perHour` captures in the rolling
 * hour, or its block is a record (longer than `minGrowth` times the longest its phase admitted).
 * `maxFiles` is an upper limit on the rest.
 *
 * An admitted capture counts at once, so a write that then fails still uses its slot. Times are
 * the worker's monotonic milliseconds, so the rolling hour is immune to wall-clock steps.
 */
export class WriteAdmission {
  private readonly phases: Record<Phase, PhaseState> = {
    starting: { admittedTimes: [], longestAdmittedMs: 0, admitted: 0 },
    running: { admittedTimes: [], longestAdmittedMs: 0, admitted: 0 },
  };

  constructor(
    private readonly limits: Readonly<Record<Phase, Readonly<AdmissionLimits>>> = ADMISSION_LIMITS
  ) {}

  /** Decides whether a capture in `phase` whose block lasted `blockedMs` is written at `nowMs`. */
  public admit(phase: Phase, blockedMs: number, nowMs: number): AdmissionOutcome {
    const { perHour, minGrowth, maxFiles } = this.limits[phase];
    const state = this.phases[phase];
    if (state.admitted >= maxFiles) {
      return 'file_limit';
    }
    const inRollingHour = state.admittedTimes.filter((time) => time > nowMs - ROLLING_HOUR_MS);
    if (inRollingHour.length >= perHour && blockedMs <= state.longestAdmittedMs * minGrowth) {
      return 'in_window';
    }
    // The newest `perHour` times are enough to tell whether `perHour` admissions fall in the hour.
    state.admittedTimes = [...inRollingHour, nowMs].slice(-perHour);
    state.longestAdmittedMs = Math.max(state.longestAdmittedMs, blockedMs);
    state.admitted++;
    return 'admitted';
  }
}
