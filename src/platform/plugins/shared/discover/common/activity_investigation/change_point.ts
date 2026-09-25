/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ChangePoint {
  index: number;
  type: string;
  pvalue: number;
}

export const MIN_CHANGE_POINT_BUCKETS = 22;
export const MAX_CHANGE_POINT_BUCKETS = 1_000;
// Leave room below ES|QL's 10,000-row ceiling; larger experiments use several complete batches.
export const MAX_CHANGE_POINT_BATCH_ROWS = 9_600;

/** Builds an index-free CHANGE_POINT request for complete, already aggregated series. */
export const buildChangePointQuery = (series: readonly (readonly number[])[]): string => {
  const length = series[0]?.length ?? 0;
  if (
    length < MIN_CHANGE_POINT_BUCKETS ||
    length > MAX_CHANGE_POINT_BUCKETS ||
    series.length * length > MAX_CHANGE_POINT_BATCH_ROWS ||
    series.some(
      (counts) =>
        counts.length !== length ||
        counts.some((count) => !Number.isSafeInteger(count) || count < 0)
    )
  ) {
    throw new Error('Expected equal series of 22–1,000 buckets and at most 9,600 rows');
  }
  const buckets = series[0].map((_, index) => index).join(',');
  if (series.length === 1) {
    // Keep Discover's existing single-series request; BY is needed only for the grouped experiment.
    return [
      `ROW bucket = [${buckets}], counts = "${series[0].join(',')}"`,
      '| MV_EXPAND bucket',
      '| EVAL results = TO_LONG(MV_SLICE(SPLIT(counts, ","), bucket))',
      '| KEEP bucket, results',
      '| CHANGE_POINT results ON bucket',
      '| SORT bucket',
      `| LIMIT ${length}`,
    ].join('\n');
  }
  const choices = series.flatMap((counts, index) => [
    `series == ${index}`,
    `"${counts.join(',')}"`,
  ]);
  const groups = series.map((_, index) => index).join(',');
  // Only validated integers enter the query; group names never become executable ES|QL.
  // SPLIT retains order and repeated counts, unlike stored multivalued fields.
  return [
    `ROW series = [${groups}], bucket = [${buckets}]`,
    '| MV_EXPAND series',
    '| MV_EXPAND bucket',
    `| EVAL results = TO_LONG(MV_SLICE(SPLIT(CASE(${choices.join(',')}), ","), bucket))`,
    '| KEEP series, bucket, results',
    '| CHANGE_POINT results ON bucket AS type, pvalue BY series',
    '| SORT series, bucket',
    `| LIMIT ${series.length * length}`,
  ].join('\n');
};

/** Returns points only when the response contains exactly the original complete series. */
export const readChangePoints = (
  response: {
    columns: ReadonlyArray<{ name: string }>;
    values: ReadonlyArray<
      ReadonlyArray<
        string | number | boolean | null | ReadonlyArray<string | number | boolean | null>
      >
    >;
  },
  series: readonly (readonly number[])[]
): ChangePoint[][] | undefined => {
  const { columns, values } = response;
  const positions = ['bucket', 'results', 'type', 'pvalue'].map((name) =>
    columns.findIndex((column) => column.name === name)
  );
  const seriesColumn = columns.findIndex(({ name }) => name === 'series');
  const bucketCount = series[0]?.length ?? 0;
  if (
    positions.some((position) => position < 0) ||
    (series.length > 1 && seriesColumn < 0) ||
    values.length !== series.length * bucketCount
  ) {
    return undefined;
  }
  const [bucketColumn, countColumn, typeColumn, pvalueColumn] = positions;
  const points = series.map((): ChangePoint[] => []);
  for (const [position, row] of values.entries()) {
    const group = Math.floor(position / bucketCount);
    const bucket = position % bucketCount;
    if (
      (seriesColumn >= 0 && row[seriesColumn] !== group) ||
      row[bucketColumn] !== bucket ||
      row[countColumn] !== series[group][bucket]
    ) {
      return undefined;
    }
    const type = row[typeColumn];
    if (type === null) continue;
    const pvalue = row[pvalueColumn];
    if (
      typeof type !== 'string' ||
      typeof pvalue !== 'number' ||
      !Number.isFinite(pvalue) ||
      pvalue < 0 ||
      pvalue > 1
    ) {
      return undefined;
    }
    points[group].push({ index: bucket, type, pvalue });
  }
  return points;
};
