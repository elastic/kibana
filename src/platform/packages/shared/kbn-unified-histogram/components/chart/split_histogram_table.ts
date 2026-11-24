/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';

export const HISTOGRAM_OVERLAY_COLUMN = 'overlay';
export const HISTOGRAM_REMAINDER_COLUMN = 'remainder';
export const HISTOGRAM_TOTAL_COLUMN = 'results';

export interface HistogramComparisonCount {
  timestamp: string | number;
  count: number;
}

/**
 * Reads the time column and ES|QL bucket that produced the histogram, for example `30 minute`.
 */
export const getHistogramBucket = (
  table: Datatable
): { timeColumn: string; interval: string } | undefined => {
  const timeColumn = table.columns.find((column) => column.meta?.type === 'date');
  const bucket = timeColumn?.meta?.esMeta?.bucket as
    | { interval?: unknown; unit?: unknown }
    | undefined;
  if (
    !timeColumn ||
    typeof bucket?.interval !== 'number' ||
    typeof bucket.unit !== 'string' ||
    !/^[a-z]+$/i.test(bucket.unit)
  ) {
    return undefined;
  }
  return { timeColumn: timeColumn.id, interval: `${bucket.interval} ${bucket.unit}` };
};

const toBucketKey = (timestamp: unknown): string => {
  const time = typeof timestamp === 'number' ? timestamp : Date.parse(String(timestamp));
  return Number.isNaN(time) ? String(timestamp) : String(time);
};

/**
 * Joins selected counts onto the loaded histogram rows. Missing buckets are zero.
 * The selected series is clipped to the bucket total.
 */
export const splitHistogramTable = ({
  table,
  timeColumn,
  counts,
  label,
  remainderLabel,
}: {
  table: Datatable;
  timeColumn: string;
  counts: HistogramComparisonCount[];
  label: string;
  remainderLabel: string;
}): { table: Datatable; approximate: boolean } | undefined => {
  if (!table.columns.some((column) => column.id === HISTOGRAM_TOTAL_COLUMN)) {
    return undefined;
  }

  const countsByBucket = new Map(
    counts.map(({ timestamp, count }) => [toBucketKey(timestamp), count])
  );
  let approximate = false;
  const rows = table.rows.map((row) => {
    const total = typeof row[HISTOGRAM_TOTAL_COLUMN] === 'number' ? row[HISTOGRAM_TOTAL_COLUMN] : 0;
    const rawCount = countsByBucket.get(toBucketKey(row[timeColumn])) ?? 0;
    const overlay = Math.min(Math.max(rawCount, 0), total);
    if (overlay !== rawCount) {
      approximate = true;
    }
    return {
      ...row,
      [HISTOGRAM_OVERLAY_COLUMN]: overlay,
      [HISTOGRAM_REMAINDER_COLUMN]: total - overlay,
    };
  });

  return {
    table: {
      ...table,
      columns: [
        ...table.columns,
        { id: HISTOGRAM_OVERLAY_COLUMN, name: label, meta: { type: 'number' } },
        { id: HISTOGRAM_REMAINDER_COLUMN, name: remainderLabel, meta: { type: 'number' } },
      ],
      rows,
    },
    approximate,
  };
};
