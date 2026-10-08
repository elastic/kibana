/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_LARGEST_FILES, MAX_RANKED_FILES, MAX_WRITTEN_FILES, MIN_BLOCK_GROWTH } from './types';

export interface AdmissionLimits {
  /** Size of the ranking of the largest blocks written. */
  maxLargest: number;
  /** Factor by which a block must exceed a ranked block (or the largest, for a record). */
  minGrowth: number;
  /** Files written for ranking; records may use the rest of `maxFiles`. */
  maxRanked: number;
  maxFiles: number;
}

export const DEFAULT_ADMISSION_LIMITS: AdmissionLimits = {
  maxLargest: MAX_LARGEST_FILES,
  minGrowth: MIN_BLOCK_GROWTH,
  maxRanked: MAX_RANKED_FILES,
  maxFiles: MAX_WRITTEN_FILES,
};

export type Admission = { write: true } | { write: false; reason: string };

/**
 * Decides which kept windows are written to the diagnostics directory. Files there may be
 * uploaded and deleted at any time, so a written file is never replaced: a window is written only
 * if its largest block is a record (exceeding the largest written by the growth factor), or ranks
 * among the largest written (by that factor once the ranking is full) within the ranked budget.
 * Records keep a block within the growth factor of the session's largest written, even while blocks
 * keep growing (e.g. a leak) after the ranked budget is used up. Memory is constant: only block
 * durations are held, never profiles.
 */
export class WriteAdmission {
  /** Largest block of each ranked written window, in descending order. */
  private readonly largest: number[] = [];
  private written = 0;
  private ranked = 0;

  constructor(private readonly limits: AdmissionLimits = DEFAULT_ADMISSION_LIMITS) {}

  /** Admits (and records) a window whose largest block lasted `blockedMs`. */
  public admit(blockedMs: number): Admission {
    const { maxLargest, minGrowth, maxRanked, maxFiles } = this.limits;
    if (this.written >= maxFiles) {
      return { write: false, reason: `file limit (${maxFiles}) reached` };
    }
    const { largest } = this;
    const recordBar = (largest[0] ?? 0) * minGrowth;
    if (blockedMs <= recordBar) {
      if (this.ranked >= maxRanked) {
        return {
          write: false,
          reason: `ranked file budget (${maxRanked}) used and not above ~${Math.round(
            recordBar
          )}ms (${minGrowth}x the largest block written)`,
        };
      }
      if (largest.length >= maxLargest) {
        const rankBar = largest[largest.length - 1] * minGrowth;
        if (blockedMs <= rankBar) {
          return {
            write: false,
            reason: `not above ~${Math.round(
              rankBar
            )}ms (${minGrowth}x the smallest of the ${maxLargest} largest blocks written)`,
          };
        }
      }
      this.ranked++;
    }
    const index = largest.findIndex((ms) => blockedMs > ms);
    largest.splice(index === -1 ? largest.length : index, 0, blockedMs);
    if (largest.length > maxLargest) largest.pop();
    this.written++;
    return { write: true };
  }
}
