/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  formatEsqlIdentifier,
} from '@kbn/esql-utils';
import type { IEsqlSearchParams, IEsqlSearchResult } from '@kbn/search-types';
import type { ActivityBucket } from '../../../../../common/activity_investigation/activity_increase';
import type { TimeWindow } from '../../../../../common/activity_investigation/interval_detector/history_plan';

interface QueryResult {
  request: IEsqlSearchParams;
  rawResponse: IEsqlSearchResult['rawResponse'];
}

export interface ActivitySumSeries {
  readonly field: string;
  /** Per-bucket sums of the field today, on the view's buckets. */
  readonly buckets: readonly ActivityBucket[];
  /** The same sums in each reference window, most recent first. */
  readonly references: readonly (readonly number[])[];
  readonly request: IEsqlSearchParams;
}

/** Collects per-bucket sums of numeric output fields, today and in each reference window. */
export const collectActivitySums = async ({
  query,
  timeFieldName,
  buckets,
  fromMs,
  toMs,
  fields,
  references,
  execute,
  signal,
}: {
  query: string;
  timeFieldName: string;
  buckets: readonly ActivityBucket[];
  fromMs: number;
  toMs: number;
  fields: ReadonlyArray<{ readonly name: string }>;
  references: readonly TimeWindow[];
  execute: (query: string, window?: TimeWindow) => Promise<QueryResult>;
  signal: AbortSignal;
}): Promise<{ series: ActivitySumSeries[]; complete: boolean }> => {
  const series: ActivitySumSeries[] = [];
  const first = buckets[0];
  if (!first) return { series, complete: false };
  const intervalMs = first.endTimeMs - first.startTimeMs;
  const maxRows = Math.ceil((toMs - fromMs) / intervalMs) + 2;
  const names = new Set([timeFieldName, ...fields.map(({ name }) => name)]);
  const unusedName = (prefix: string): string => {
    let name = prefix;
    while (names.has(name)) name += '_';
    names.add(name);

    return name;
  };
  const timeColumn = unusedName('__discover_activity_time');
  const sumColumn = unusedName('__discover_activity_sum');
  let complete = true;

  // Sums per bucket start, or undefined when the rows cannot be trusted or a sum is negative.
  const readSums = (
    rawResponse: QueryResult['rawResponse'],
    anchorMs: number,
    bounds: TimeWindow
  ): Map<number, number> | undefined => {
    const timeIndex = rawResponse.columns.findIndex(({ name }) => name === timeColumn);
    const sumIndex = rawResponse.columns.findIndex(({ name }) => name === sumColumn);
    if (timeIndex < 0 || sumIndex < 0 || rawResponse.values.length > maxRows) return undefined;
    const sums = new Map<number, number>();
    for (const row of rawResponse.values) {
      const time = row[timeIndex];
      const start = typeof time === 'string' ? Date.parse(time) : time;
      // A bucket whose rows all lack the field has no sum: it contributes nothing.
      const sum = row[sumIndex] ?? 0;
      if (
        typeof start !== 'number' ||
        !Number.isSafeInteger(start) ||
        (start - anchorMs) % intervalMs !== 0 ||
        start + intervalMs <= bounds.fromMs ||
        start > bounds.toMs ||
        typeof sum !== 'number' ||
        !Number.isFinite(sum) ||
        sum < 0 ||
        sums.has(start)
      ) {
        return undefined;
      }
      sums.set(start, sum);
    }

    return sums;
  };

  for (const { name: field } of fields) {
    signal.throwIfAborted();
    const sumQuery = appendToESQLQuery(
      appendToESQLQuery(
        convertTimeseriesCommandToFrom(query),
        `| STATS ${sumColumn} = SUM(${formatEsqlIdentifier(
          field
        )}) BY ${timeColumn} = BUCKET(${formatEsqlIdentifier(timeFieldName)}, ${
          intervalMs / 1000
        } seconds)`
      ),
      `| LIMIT ${maxRows + 1}`
    );
    try {
      const { rawResponse, request } = await execute(sumQuery);
      const current = readSums(rawResponse, first.startTimeMs, { fromMs, toMs });
      if (!current) {
        complete = false;
        continue;
      }
      const windows: Array<Map<number, number>> = [];
      for (const window of references) {
        const response = await execute(sumQuery, window);
        const windowSums = readSums(response.rawResponse, window.fromMs, window);
        if (!windowSums) break;
        windows.push(windowSums);
      }
      if (windows.length !== references.length) {
        complete = false;
        continue;
      }
      series.push({
        field,
        buckets: buckets.map((bucket) => ({ ...bucket, count: current.get(bucket.startTimeMs) ?? 0 })),
        references: references.map((window, index) =>
          Array.from(
            { length: Math.round((window.toMs - window.fromMs) / intervalMs) },
            (_, bucket) => windows[index].get(window.fromMs + bucket * intervalMs) ?? 0
          )
        ),
        request,
      });
    } catch {
      signal.throwIfAborted();
      complete = false;
    }
  }
  signal.throwIfAborted();

  return { series, complete };
};
