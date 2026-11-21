/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADMISSION_LIMITS, ROLLING_HOUR_MS } from './constants';
import type { AdmissionOutcome, Phase } from './types';

interface PhaseState {
  /** Newest admission times, at most `perHour`. */
  admittedTimes: number[];
  longestAdmittedMs: number;
  admitted: number;
}

const newPhaseState = (): PhaseState => ({ admittedTimes: [], longestAdmittedMs: 0, admitted: 0 });

/**
 * Admits profile captures for file output independently per phase. Allows `perHour` admissions
 * per rolling hour; after that, a block must exceed `minGrowth` times the longest admitted block.
 * `maxFiles` caps lifetime admissions, and a failed write still consumes a slot.
 */
export class WriteAdmission {
  private readonly phases: Record<Phase, PhaseState> = {
    starting: newPhaseState(),
    running: newPhaseState(),
  };

  constructor(private readonly limits = ADMISSION_LIMITS) {}

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
    // Only the newest `perHour` timestamps matter; if these have aged out, fewer than `perHour`
    // admissions remain in the hour.
    state.admittedTimes = [...inRollingHour, nowMs].slice(-perHour);
    state.longestAdmittedMs = Math.max(state.longestAdmittedMs, blockedMs);
    state.admitted++;
    return 'admitted';
  }
}
