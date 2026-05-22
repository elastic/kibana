/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Canonical string constants for each significance tier. Import these instead of raw strings
 *  to prevent key mismatches across consumers. */
export const PVALUE_IMPACT_LEVELS = {
  HIGH: 'high',
  MODERATE: 'moderate',
  LOW: 'low',
} as const;

/** Significance tier derived from a change-point pvalue. Lower pvalue = more significant. */
export type PvalueImpactLevel = (typeof PVALUE_IMPACT_LEVELS)[keyof typeof PVALUE_IMPACT_LEVELS];

// Canonical thresholds; consumed by change_point_badge.tsx and Discover's change_point_pvalue_cell.tsx.
const PVALUE_THRESHOLDS: Array<{ max: number; level: PvalueImpactLevel }> = [
  { max: 0.0001, level: PVALUE_IMPACT_LEVELS.HIGH },
  { max: 0.005, level: PVALUE_IMPACT_LEVELS.MODERATE },
  { max: 0.03, level: PVALUE_IMPACT_LEVELS.LOW },
];

/** Maps a numeric pvalue to its significance tier. */
export const getPvalueImpactLevel = (pvalue: number): PvalueImpactLevel => {
  for (const { max, level } of PVALUE_THRESHOLDS) {
    if (pvalue < max) return level;
  }
  return PVALUE_IMPACT_LEVELS.LOW;
};

/** EUI semantic colour token for each significance tier, matching the Discover results table. */
export const PVALUE_IMPACT_COLORS: Record<PvalueImpactLevel, string> = {
  [PVALUE_IMPACT_LEVELS.HIGH]: 'danger',
  [PVALUE_IMPACT_LEVELS.MODERATE]: 'warning',
  [PVALUE_IMPACT_LEVELS.LOW]: 'primary',
};

export const formatPvalueLabel = (p: unknown): string => {
  if (typeof p === 'number' && Number.isFinite(p)) {
    if (p === 0) return '0';
    if (p >= 0.01 && p < 1) return p.toFixed(5);
    return p.toExponential(2);
  }
  return String(p ?? '');
};
