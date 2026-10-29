/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DurationStats, LatencyMapSelection } from '../types';
import { LATENCY_MAP_ROWS, durationUsToRow } from '../query/duration_rows';
import type { LatencyGrid } from '../query/parse';
import { timeToEdge } from '../query/time_grid';
import type { TimeGrid } from '../query/time_grid';

/** Below this share of a cell, the overlap is rounding, not a cell the selection takes part of. */
const NEGLIGIBLE = 1e-6;

const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

export interface SelectionCounts {
  spans: number;
  failed: number;
  /**
   * The selection does not follow the edges of the cells, as when the map was resized or its range
   * changed after the selection was made. Cells it covers in part count in part.
   */
  estimated: boolean;
}

/**
 * The spans in a selection, from the cells of the map and the selection's own bounds, which are what
 * the host's condition uses. A cell covered in part counts for the share of its time and of its
 * duration row that the selection covers (the row in the map's own scale, log below the p99), so a
 * selection that no longer lines up with the cells is still counted over its own bounds. Over
 * cell edges the count is exact.
 */
export function getSelectionCounts({
  grid,
  timeGrid,
  stats,
  selection,
}: {
  grid: LatencyGrid;
  timeGrid: TimeGrid;
  stats: DurationStats;
  selection: LatencyMapSelection;
}): SelectionCounts {
  // Edges are measured so that the last column, which may reach past the range, is as wide as the
  // data it has: a selection over all of it covers all of it.
  const fromEdge = timeToEdge(timeGrid, Date.parse(selection.from));
  const toEdge = timeToEdge(timeGrid, Date.parse(selection.to));
  const rowOf = (durationUs: number) =>
    Math.min(LATENCY_MAP_ROWS, Math.max(0, durationUsToRow(durationUs, stats)));
  // The bottom row reads everything below it too: a minimum of 0 starts at its floor.
  const lowRow = selection.minDurationUs <= 0 ? 0 : rowOf(selection.minDurationUs);
  const highRow = rowOf(selection.maxDurationUs);

  let spans = 0;
  let failed = 0;
  let estimated = false;
  grid.cells.forEach((cell) => {
    const share =
      overlap(fromEdge, toEdge, cell.xi, cell.xi + 1) *
      overlap(lowRow, highRow, cell.yi, cell.yi + 1);
    if (share < NEGLIGIBLE) return;
    if (share < 1 - NEGLIGIBLE) estimated = true;
    spans += cell.spans * share;
    failed += cell.failed * share;
  });
  spans = Math.round(spans);
  failed = Math.round(failed);
  // A selection about failures selects the failed spans only.
  return selection.failedOnly
    ? { spans: failed, failed: 0, estimated }
    : { spans, failed, estimated };
}
