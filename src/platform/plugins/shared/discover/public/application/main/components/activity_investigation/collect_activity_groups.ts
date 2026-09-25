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
  formatEsqlEntityPredicate,
  formatEsqlIdentifier,
  formatEsqlLiteral,
} from '@kbn/esql-utils';
import type { IEsqlSearchParams, IEsqlSearchResult } from '@kbn/search-types';
import type { ActivityInvestigationSnapshot } from '../../../../../common/activity_investigation/attachment';
import type { ActivityBucket } from '../../../../../common/activity_investigation/activity_increase';

const CATEGORICAL_TYPES = new Set(['keyword', 'boolean', 'ip']);
// One spare row reveals truncation instead of silently keeping only the largest groups.
const MAX_GROUP_ROWS = 9_600;

type Actor = NonNullable<ActivityInvestigationSnapshot['actor']>;
type GroupValue = string | boolean | null;
type QueryResult = {
  request: IEsqlSearchParams;
  rawResponse: IEsqlSearchResult['rawResponse'];
};

export interface ActivityGroupSeries {
  readonly actor: Actor;
  readonly query: string;
  readonly buckets: readonly ActivityBucket[];
  readonly request: IEsqlSearchParams;
}

/** Collects complete categorical groups without changing the original query's row population. */
export const collectActivityGroups = async ({
  query,
  timeFieldName,
  buckets,
  fromMs,
  toMs,
  maxGroups,
  execute,
  signal,
}: {
  query: string;
  timeFieldName: string;
  buckets: readonly ActivityBucket[];
  fromMs: number;
  toMs: number;
  maxGroups: number;
  execute: (query: string) => Promise<QueryResult>;
  signal: AbortSignal;
}): Promise<{ series: ActivityGroupSeries[]; complete: boolean }> => {
  signal.throwIfAborted();
  const series: ActivityGroupSeries[] = [];
  const first = buckets[0];
  if (!first) return { series, complete: false };
  const intervalMs = first.endTimeMs - first.startTimeMs;
  let metadata: QueryResult;
  try {
    metadata = await execute(appendToESQLQuery(query, '| LIMIT 0'));
  } catch {
    signal.throwIfAborted();
    return { series, complete: false };
  }
  const columns = metadata.rawResponse.columns;
  if (!columns.some(({ name }) => name === timeFieldName)) {
    return { series, complete: false };
  }
  const fields = columns.filter(({ type }) => CATEGORICAL_TYPES.has(type));
  const names = new Set(columns.map(({ name }) => name));
  const unusedName = (prefix: string): string => {
    let name = prefix;
    while (names.has(name)) name += '_';
    names.add(name);
    return name;
  };
  const groupColumn = unusedName('__discover_activity_group');
  const timeColumn = unusedName('__discover_activity_time');
  const countColumn = unusedName('__discover_activity_count');
  let complete = true;

  for (const { name: field, type } of fields) {
    signal.throwIfAborted();
    // One aggregation per field: the response limit bounds output, not the underlying scan.
    const groupedQuery = appendToESQLQuery(
      convertTimeseriesCommandToFrom(query),
      `| STATS ${countColumn} = COUNT(*) BY ${timeColumn} = BUCKET(${formatEsqlIdentifier(
        timeFieldName
      )}, ${intervalMs / 1000} seconds), ${groupColumn} = ${formatEsqlIdentifier(field)}`
    );
    try {
      const { rawResponse, request } = await execute(
        appendToESQLQuery(groupedQuery, `| LIMIT ${MAX_GROUP_ROWS + 1}`)
      );
      const timeIndex = rawResponse.columns.findIndex(({ name }) => name === timeColumn);
      const groupIndex = rawResponse.columns.findIndex(({ name }) => name === groupColumn);
      const countIndex = rawResponse.columns.findIndex(({ name }) => name === countColumn);
      if (
        [timeIndex, groupIndex, countIndex].some((index) => index < 0) ||
        rawResponse.values.length > MAX_GROUP_ROWS
      ) {
        complete = false;
        continue;
      }

      const groups = new Map<GroupValue, Map<number, number>>();
      let valid = true;
      for (const row of rawResponse.values) {
        const time = row[timeIndex];
        const start = typeof time === 'string' ? Date.parse(time) : time;
        const count = row[countIndex];
        const value = row[groupIndex];
        if (
          typeof start !== 'number' ||
          !Number.isSafeInteger(start) ||
          (start - first.startTimeMs) % intervalMs !== 0 ||
          start + intervalMs <= fromMs ||
          start > toMs ||
          typeof count !== 'number' ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          (value !== null && typeof value !== 'string' && typeof value !== 'boolean') ||
          (value !== null &&
            (type === 'boolean' ? typeof value !== 'boolean' : typeof value !== 'string'))
        ) {
          valid = false;
          break;
        }
        const counts = groups.get(value) ?? new Map<number, number>();
        if (counts.has(start)) {
          valid = false;
          break;
        }
        counts.set(start, count);
        groups.set(value, counts);
        if (groups.size > maxGroups) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        complete = false;
        continue;
      }

      // Every result must belong to at least one group, including the missing-value group.
      // Multivalued fields can overlap, so their sum may exceed the total but cannot be smaller.
      if (
        buckets.some(
          ({ startTimeMs, count }) =>
            [...groups.values()].reduce(
              (sum, groupCounts) => sum + (groupCounts.get(startTimeMs) ?? 0),
              0
            ) < count
        )
      ) {
        complete = false;
        continue;
      }

      const fieldSeries: ActivityGroupSeries[] = [];
      for (const [value, counts] of groups) {
        const groupBuckets = buckets.map((bucket) => ({
          ...bucket,
          count: counts.get(bucket.startTimeMs) ?? 0,
        }));
        if (groupBuckets.some(({ count }, index) => count > buckets[index].count)) {
          valid = false;
          break;
        }
        // A value present in every result is already represented by the total series.
        if (groupBuckets.every(({ count }, index) => count === buckets[index].count)) continue;

        // Filter AFTER the original pipeline, including LIMIT. MV_CONTAINS also preserves
        // membership in multivalued fields; scalar equality would silently lose those rows.
        const predicate =
          value === null
            ? formatEsqlEntityPredicate(field, value)
            : `MV_CONTAINS(${formatEsqlIdentifier(field)}, ${formatEsqlLiteral(value)}::${type})`;
        fieldSeries.push({
          actor: { field, value },
          query: appendToESQLQuery(query, `| WHERE ${predicate}`),
          buckets: groupBuckets,
          request: {
            ...request,
            query: appendToESQLQuery(
              request.query,
              `| WHERE ${formatEsqlEntityPredicate(groupColumn, value)}`
            ),
          },
        });
      }
      if (valid) {
        series.push(...fieldSeries);
      } else {
        complete = false;
      }
    } catch {
      signal.throwIfAborted();
      complete = false;
    }
  }
  signal.throwIfAborted();
  return { series, complete };
};
