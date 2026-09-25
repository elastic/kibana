/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, ProjectRouting, TimeRange } from '@kbn/es-query';
import { buildEsQuery, getTimeZoneFromSettings } from '@kbn/es-query';
import { getEsQueryConfig, getTime } from '@kbn/data-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { IEsqlSearchParams } from '@kbn/search-types';
import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  fixESQLQueryWithVariables,
  formatEsqlIdentifier,
  getNamedParams,
  hasTransformationalCommand,
  removeDropCommandsFromESQLQuery,
} from '@kbn/esql-utils';
import { cloneDeep } from 'lodash';
import { deepFreeze } from '@kbn/std';
import {
  ACTIVITY_INCREASE_SELECTION_CONFIG,
  compareActivityIncreases,
  type ActivityBucket,
  type ActivityIncrease,
} from '../../../../../common/activity_investigation/activity_increase';
import {
  ACTIVITY_CHANGE_POINT_CONFIG,
  getStrongestChangePointIncrease,
} from '../../../../../common/activity_investigation/describe_activity_change_points';
import type { ActivityInvestigationSnapshot } from '../../../../../common/activity_investigation/attachment';
import type { DiscoverServices } from '../../../../build_services';
import { detectActivityChangePoint } from './detect_activity_change_point';
import { collectActivityGroups } from './collect_activity_groups';

const TOTAL_ACTIVITY_RESULT_ID = 'total';

export const ACTIVITY_INVESTIGATION_CONFIG = Object.freeze({
  targetBuckets: 48,
  // Twice the target is just a safety margin, not a detector requirement.
  maxBuckets: 96,
  // Analyze the whole field or skip it; never substitute only its most frequent values.
  maxGroupsPerField: 100,
  timeoutMs: 10_000,
  refreshIntervalMs: 30_000,
  detector: ACTIVITY_CHANGE_POINT_CONFIG,
  selection: ACTIVITY_INCREASE_SELECTION_CONFIG,
});

export interface ActivityInvestigationContext {
  readonly query: AggregateQuery;
  readonly indexPattern: string;
  readonly timeFieldName: string;
  readonly timeRange: TimeRange;
  readonly filters: Filter[];
  readonly esqlVariables: ESQLControlVariable[];
  readonly projectRouting?: ProjectRouting;
}

export interface ActivityInvestigationResult {
  readonly id: string;
  readonly actor?: ActivityInvestigationSnapshot['actor'];
  // The producer supplies actor-scoped context and request; the UI does not rewrite queries.
  readonly context: ActivityInvestigationContext;
  readonly request: IEsqlSearchParams;
  readonly asOfMs: number;
  readonly metric: 'query_result_count';
  readonly buckets: readonly ActivityBucket[];
  readonly increase: ActivityIncrease;
}

export interface ActivityInvestigationResponse {
  readonly results: readonly ActivityInvestigationResult[];
  readonly groupAnalysisIncomplete: boolean;
}

/** Analyzes a frozen Discover context using the histogram's existing ES|QL preparation utilities. */
export const fetchActivityInvestigation = async (
  input: ActivityInvestigationContext,
  { data, uiSettings }: Pick<DiscoverServices, 'data' | 'uiSettings'>,
  abortSignal: AbortSignal
): Promise<ActivityInvestigationResponse | undefined> => {
  const context = cloneDeep(input);
  const asOfMs = Date.now();
  const { query, timeFieldName, timeRange, filters, esqlVariables } = context;
  const fromMs = Date.parse(timeRange.from);
  const toMs = Date.parse(timeRange.to);
  if (
    !Number.isSafeInteger(fromMs) ||
    !Number.isSafeInteger(toMs) ||
    fromMs >= toMs ||
    hasTransformationalCommand(query.esql)
  ) {
    return undefined;
  }

  // A range like "Today" can end in the future. Only use buckets that have already finished.
  const completeToMs = Math.min(toMs, asOfMs);
  const intervalSeconds = Math.max(
    1,
    Math.ceil((toMs - fromMs) / 1000 / ACTIVITY_INVESTIGATION_CONFIG.targetBuckets)
  );
  const intervalMs = intervalSeconds * 1000;
  if (
    Math.floor((completeToMs - fromMs) / intervalMs) <
    ACTIVITY_INVESTIGATION_CONFIG.detector.minCompleteBuckets
  ) {
    return undefined;
  }

  // Same preparation as LensVisService.getESQLHistogramQuery, without changing
  // that shared path. In particular, the user's LIMIT remains before STATS.
  const histogramQuery = appendToESQLQuery(
    convertTimeseriesCommandToFrom(removeDropCommandsFromESQLQuery(query.esql)),
    `| STATS results = COUNT(*) BY timestamp = BUCKET(${formatEsqlIdentifier(
      timeFieldName
    )}, ${intervalSeconds} seconds)`
  );
  // Ask for one extra bucket. If it comes back, we reject the result below
  // rather than treating a truncated response as complete.
  const analysisQuery = appendToESQLQuery(
    histogramQuery,
    `| LIMIT ${ACTIVITY_INVESTIGATION_CONFIG.maxBuckets + 1}`
  );
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timeFilter = getTime(undefined, timeRange, { fieldName: timeFieldName });
  if (!timeFilter || abortSignal.aborted) return undefined;
  const filter = buildEsQuery(undefined, [], [...filters, timeFilter], esQueryConfig);
  const timeZone = esQueryConfig.dateFormatTZ
    ? getTimeZoneFromSettings(esQueryConfig.dateFormatTZ)
    : 'UTC';
  deepFreeze(context);

  const execute = async (queryText: string) => {
    abortSignal.throwIfAborted();
    const preparedQuery = fixESQLQueryWithVariables(queryText, esqlVariables);
    const request: IEsqlSearchParams = {
      query: preparedQuery,
      filter,
      params: getNamedParams(preparedQuery, timeRange, esqlVariables),
      timeZone,
    };
    deepFreeze(request);
    const { rawResponse, warning } = await data.search.esql(cloneDeep(request), {
      abortSignal,
      projectRouting: context.projectRouting,
      approximation: false,
      dropNullColumns: false,
      includeExecutionMetadata: true,
    });
    abortSignal.throwIfAborted();
    const { _clusters: clusters } = rawResponse;
    if (
      warning ||
      rawResponse.is_partial ||
      rawResponse.is_running ||
      ('approximation_applied' in rawResponse && rawResponse.approximation_applied) ||
      !clusters ||
      clusters.successful !== clusters.total ||
      clusters.partial ||
      clusters.failed ||
      clusters.running ||
      clusters.skipped ||
      Object.values(clusters.details ?? {}).some(
        (cluster) =>
          cluster.status !== 'successful' ||
          Boolean(cluster.failures?.length) ||
          Boolean(cluster._shards?.failed)
      )
    ) {
      throw new Error('Incomplete activity investigation response');
    }
    return { request, rawResponse };
  };

  const { request, rawResponse } = await execute(analysisQuery);
  const { columns, values } = rawResponse;
  if (values.length > ACTIVITY_INVESTIGATION_CONFIG.maxBuckets) return undefined;

  const timeIndex = columns.findIndex(({ name }) => name === 'timestamp');
  const countIndex = columns.findIndex(({ name }) => name === 'results');
  if (timeIndex < 0 || countIndex < 0) return undefined;
  const counts = new Map<number, number>();
  for (const row of values) {
    const time = row[timeIndex];
    const start = typeof time === 'string' ? Date.parse(time) : time;
    const count = row[countIndex];
    if (
      typeof start !== 'number' ||
      !Number.isSafeInteger(start) ||
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      counts.has(start)
    ) {
      return undefined;
    }
    counts.set(start, count);
  }

  // Use the returned bucket alignment (including the query's time zone), and
  // fill gaps only after the complete response has passed the quality checks.
  const anchor = counts.keys().next().value ?? 0;
  const first = anchor + Math.ceil((fromMs - anchor) / intervalMs) * intervalMs;
  const end = anchor + Math.floor((completeToMs - anchor) / intervalMs) * intervalMs;
  if (
    [...counts.keys()].some(
      (start) => (start - anchor) % intervalMs !== 0 || start + intervalMs <= fromMs || start > toMs
    )
  ) {
    return undefined;
  }
  const buckets: ActivityBucket[] = [];
  for (let start = first; start < end; start += intervalMs) {
    buckets.push({
      startTimeMs: start,
      endTimeMs: start + intervalMs,
      count: counts.get(start) ?? 0,
    });
  }
  const total = buckets.reduce((sum, { count }) => sum + count, 0);
  if (
    buckets.length < ACTIVITY_INVESTIGATION_CONFIG.detector.minCompleteBuckets ||
    buckets.length > ACTIVITY_INVESTIGATION_CONFIG.maxBuckets ||
    abortSignal.aborted ||
    !Number.isSafeInteger(total)
  ) {
    return undefined;
  }
  if (total === 0) return { results: [], groupAnalysisIncomplete: false };
  const groups = await collectActivityGroups({
    query: query.esql,
    timeFieldName,
    buckets,
    fromMs,
    toMs,
    maxGroups: ACTIVITY_INVESTIGATION_CONFIG.maxGroupsPerField,
    execute,
    signal: abortSignal,
  });
  const series: Array<Omit<ActivityInvestigationResult, 'increase'>> = [
    {
      id: TOTAL_ACTIVITY_RESULT_ID,
      context,
      request,
      asOfMs,
      metric: 'query_result_count',
      buckets,
    },
    ...groups.series.map(
      ({ actor, query: actorQuery, buckets: actorBuckets, request: actorRequest }) => ({
        id: JSON.stringify([actor.field, actor.value]),
        actor,
        context: { ...context, query: { ...context.query, esql: actorQuery } },
        request: actorRequest,
        asOfMs,
        metric: 'query_result_count' as const,
        buckets: actorBuckets,
      })
    ),
  ];
  // Groups are analyzed even when the total is stable, and batches share one detector/configuration.
  const changes = await detectActivityChangePoint(
    series.map((item) => item.buckets),
    data.search,
    abortSignal,
    ACTIVITY_INVESTIGATION_CONFIG.detector
  );
  if (abortSignal.aborted) return undefined;

  // Apply the display filter before choosing one candidate per series and the global top results.
  const response: ActivityInvestigationResponse = {
    results: series
      .flatMap((item, index) => {
        const increase = getStrongestChangePointIncrease(
          changes[index],
          ACTIVITY_INVESTIGATION_CONFIG.selection.minRelativeIncrease
        );
        return increase ? [{ ...item, increase }] : [];
      })
      .sort((left, right) => compareActivityIncreases(left.increase, right.increase))
      .slice(0, ACTIVITY_INVESTIGATION_CONFIG.selection.maxResults),
    groupAnalysisIncomplete: !groups.complete,
  };
  deepFreeze(response);
  return response;
};
