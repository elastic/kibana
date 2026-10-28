/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The time columns of a map. A whole number of milliseconds per column, so a column edge is
 * an exact timestamp a selection can carry into a condition.
 */
export interface TimeGrid {
  fromMs: number;
  binMs: number;
  /** Columns. The last one may reach past the range, where there are no spans. */
  bins: number;
}

export function getTimeGrid(from: string, to: string, targetBins: number): TimeGrid {
  const fromMs = Date.parse(from);
  const rangeMs = Math.max(1, Date.parse(to) - fromMs);
  const binMs = Math.max(1, Math.ceil(rangeMs / Math.max(1, targetBins)));
  return { fromMs, binMs, bins: Math.ceil(rangeMs / binMs) };
}
