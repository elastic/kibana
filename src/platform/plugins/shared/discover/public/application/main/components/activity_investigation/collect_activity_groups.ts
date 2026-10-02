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
import type { TimeWindow } from '../../../../../common/activity_investigation/interval_detector/history_plan';
import {
  exceedsActivityGroupLimit,
  getActivityGroupFieldStats,
} from './get_activity_group_field_stats';

// One spare row reveals truncation instead of silently keeping only the largest groups.
const MAX_GROUP_ROWS = 9_600;

type Actor = NonNullable<ActivityInvestigationSnapshot['actor']>;
type GroupValue = string | boolean | null;
interface QueryResult {
  request: IEsqlSearchParams;
  rawResponse: IEsqlSearchResult['rawResponse'];
}

export interface ActivityGroupField {
  readonly name: string;
  readonly type: string;
}

export interface ActivityGroupSeries {
  readonly actor: Actor;
  readonly query: string;
  readonly buckets: readonly ActivityBucket[];
  /** The same value's counts in each reference window, bucket by bucket, most recent first. */
  readonly references: readonly (readonly number[])[];
  readonly request: IEsqlSearchParams;
}

type GroupCounts = Map<GroupValue, Map<number, number>>;

/** Collects complete categorical groups of the given fields, today and in each reference window. */
export const collectActivityGroups = async ({
  query,
  timeFieldName,
  buckets,
  fromMs,
  toMs,
  maxGroups,
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
  maxGroups: number;
  /** Categorical columns of the query's final output, in priority order. */
  fields: readonly ActivityGroupField[];
  references: readonly TimeWindow[];
  execute: (query: string, window?: TimeWindow) => Promise<QueryResult>;
  signal: AbortSignal;
}): Promise<{ series: ActivityGroupSeries[]; complete: boolean }> => {
  signal.throwIfAborted();
  const series: ActivityGroupSeries[] = [];
  const first = buckets[0];
  if (!first || !fields.length) return { series, complete: Boolean(first) };
  const intervalMs = first.endTimeMs - first.startTimeMs;
  const fieldStats = await getActivityGroupFieldStats({
    query,
    fields,
    minimumTotal: buckets.reduce((sum, { count }) => sum + count, 0),
    execute: (statsQuery) => execute(statsQuery),
    signal,
  });
  const names = new Set([timeFieldName, ...fields.map(({ name }) => name)]);
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

  // Reads one window's rows into counts per value, or undefined when the response cannot be trusted.
  // Buckets must sit on the grid starting at `anchorMs`; partial edge buckets inside `bounds` are read and ignored.
  const readGroups = (
    rawResponse: QueryResult['rawResponse'],
    type: string,
    anchorMs: number,
    bounds: TimeWindow
  ): GroupCounts | undefined => {
    const timeIndex = rawResponse.columns.findIndex(({ name }) => name === timeColumn);
    const groupIndex = rawResponse.columns.findIndex(({ name }) => name === groupColumn);
    const countIndex = rawResponse.columns.findIndex(({ name }) => name === countColumn);
    if (
      [timeIndex, groupIndex, countIndex].some((index) => index < 0) ||
      rawResponse.values.length > MAX_GROUP_ROWS
    ) {
      return undefined;
    }
    const groups: GroupCounts = new Map();
    for (const row of rawResponse.values) {
      const time = row[timeIndex];
      const start = typeof time === 'string' ? Date.parse(time) : time;
      const count = row[countIndex];
      const value = row[groupIndex];
      if (
        typeof start !== 'number' ||
        !Number.isSafeInteger(start) ||
        (start - anchorMs) % intervalMs !== 0 ||
        start + intervalMs <= bounds.fromMs ||
        start > bounds.toMs ||
        typeof count !== 'number' ||
        !Number.isSafeInteger(count) ||
        count < 0 ||
        (value !== null && typeof value !== 'string' && typeof value !== 'boolean') ||
        (value !== null &&
          (type === 'boolean' ? typeof value !== 'boolean' : typeof value !== 'string'))
      ) {
        return undefined;
      }
      const counts = groups.get(value) ?? new Map<number, number>();
      if (counts.has(start)) return undefined;
      counts.set(start, count);
      groups.set(value, counts);
    }

    return groups;
  };

  for (const { name: field, type } of fields) {
    signal.throwIfAborted();
    const stats = fieldStats.get(field);
    // A wholly missing field only repeats the total via its null group.
    if (stats?.count === 0) continue;
    if (
      stats &&
      stats.cardinality + (stats.count < stats.total ? 1 : 0) > maxGroups &&
      (await exceedsActivityGroupLimit({
        query,
        field: { name: field, type },
        maxGroups,
        execute: (limitQuery) => execute(limitQuery),
        signal,
      }))
    ) {
      complete = false;
      continue;
    }
    // One aggregation per field and window: the response limit bounds output, not the underlying scan.
    const groupedQuery = appendToESQLQuery(
      appendToESQLQuery(
        convertTimeseriesCommandToFrom(query),
        `| STATS ${countColumn} = COUNT(*) BY ${timeColumn} = BUCKET(${formatEsqlIdentifier(
          timeFieldName
        )}, ${intervalMs / 1000} seconds), ${groupColumn} = ${formatEsqlIdentifier(field)}`
      ),
      `| LIMIT ${MAX_GROUP_ROWS + 1}`
    );
    try {
      const { rawResponse, request } = await execute(groupedQuery);
      const groups = readGroups(rawResponse, type, first.startTimeMs, { fromMs, toMs });
      if (!groups || groups.size > maxGroups) {
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
      const referenceGroups: GroupCounts[] = [];
      for (const window of references) {
        const response = await execute(groupedQuery, window);
        const windowGroups = readGroups(response.rawResponse, type, window.fromMs, window);
        if (!windowGroups) break;
        referenceGroups.push(windowGroups);
      }
      if (referenceGroups.length !== references.length) {
        complete = false;
        continue;
      }

      const fieldSeries: ActivityGroupSeries[] = [];
      let valid = true;
      for (const [value, counts] of groups) {
        const groupBuckets = buckets.map((bucket) => ({
          ...bucket,
          count: counts.get(bucket.startTimeMs) ?? 0,
        }));
        if (groupBuckets.some(({ count }, index) => count > buckets[index].count)) {
          valid = false;
          break;
        }
        // Values present only in the discarded edge buckets have no activity to analyze.
        if (groupBuckets.every(({ count }) => count === 0)) continue;
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
          references: references.map((window, index) => {
            const windowCounts = referenceGroups[index].get(value);

            return Array.from(
              { length: Math.round((window.toMs - window.fromMs) / intervalMs) },
              (_, bucket) => windowCounts?.get(window.fromMs + bucket * intervalMs) ?? 0
            );
          }),
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
