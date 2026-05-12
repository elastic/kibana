/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Significance tier derived from a change-point pvalue. Lower pvalue = more significant. */
export type PvalueImpactLevel = 'high' | 'moderate' | 'minimal';

// Thresholds match the Discover results table (change_point_pvalue_cell.tsx).
const PVALUE_THRESHOLDS: Array<{ max: number; level: PvalueImpactLevel }> = [
  { max: 0.0001, level: 'high' },
  { max: 0.005, level: 'moderate' },
  { max: 0.03, level: 'minimal' },
];

/** Maps a numeric pvalue to its significance tier. */
export const getPvalueImpactLevel = (pvalue: number): PvalueImpactLevel => {
  for (const { max, level } of PVALUE_THRESHOLDS) {
    if (pvalue < max) return level;
  }
  return 'minimal';
};

/** EUI semantic colour token for each significance tier, matching the Discover results table. */
export const PVALUE_IMPACT_COLORS: Record<PvalueImpactLevel, string> = {
  high: 'danger',
  moderate: 'warning',
  minimal: 'primary',
};
