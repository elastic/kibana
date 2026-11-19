/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryResultsSummary } from '../profile/types';

export type ResultsVerdict =
  | { kind: 'same'; rowCount: number; sameOrder: boolean }
  | { kind: 'differentColumns' }
  | { kind: 'differentRowCount'; baseline: number; current: number }
  | { kind: 'differentRows'; rowCount: number };

/** Tells whether two runs returned the same results. Returns nothing when either is unknown. */
export function compareResults(
  baseline: QueryResultsSummary | undefined,
  current: QueryResultsSummary | undefined
): ResultsVerdict | undefined {
  if (!baseline || !current) {
    return undefined;
  }
  if (
    baseline.columns.length !== current.columns.length ||
    baseline.columns.some(
      ({ name, type }, index) =>
        name !== current.columns[index].name || type !== current.columns[index].type
    )
  ) {
    return { kind: 'differentColumns' };
  }
  if (baseline.rowCount !== current.rowCount) {
    return { kind: 'differentRowCount', baseline: baseline.rowCount, current: current.rowCount };
  }
  if (baseline.rowsFingerprint !== current.rowsFingerprint) {
    return { kind: 'differentRows', rowCount: current.rowCount };
  }
  return {
    kind: 'same',
    rowCount: current.rowCount,
    sameOrder: baseline.orderedFingerprint === current.orderedFingerprint,
  };
}
