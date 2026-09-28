/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { AggregateQuery, Filter, ProjectRouting, TimeRange } from '@kbn/es-query';
import { buildEsQuery, getTimeZoneFromSettings } from '@kbn/es-query';
import { getEsQueryConfig, getTime } from '@kbn/data-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { IEsqlSearchParams, IEsqlSearchResult } from '@kbn/search-types';
import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  fixESQLQueryWithVariables,
  formatEsqlIdentifier,
  getIndexPatternFromESQLQuery,
  getNamedParams,
} from '@kbn/esql-utils';
import { computeInterval } from '@kbn/visualization-utils';
import { cloneDeep } from 'lodash';
import { deepFreeze } from '@kbn/std';
import type {
  ActivityBucket,
  ActivityIncrease,
} from '../../../../../common/activity_investigation/activity_increase';
import type { ActivityInvestigationSnapshot } from '../../../../../common/activity_investigation/attachment';
import {
  ACTIVITY_INTERVAL_DETECTOR_CONFIG,
  detectActivityInterval,
} from '../../../../../common/activity_investigation/interval_detector/detect_activity_interval';
import {
  planActivityHistory,
  type TimeWindow,
} from '../../../../../common/activity_investigation/interval_detector/history_plan';
import { createSeededRandom } from '../../../../../common/activity_investigation/interval_detector/seeded_random';
import {
  createDailyReferenceLookup,
  detectExploratoryActivityInterval,
  planExploratoryHistory,
} from '../../../../../common/activity_investigation/interval_detector/exploratory_interval';
import type { DiscoverServices } from '../../../../build_services';
import { collectActivityGroups, type ActivityGroupSeries } from './collect_activity_groups';
import { collectActivitySums, type ActivitySumSeries } from './collect_activity_sums';
import { selectActivityGroupFields, selectActivitySumFields } from './select_activity_group_fields';
import { getActivityQueryFields } from './get_activity_query_fields';

const TOTAL_ACTIVITY_RESULT_ID = 'total';
// Commands that change which rows exist: their counts cannot be compared with other days. KEEP and DROP only
// change the columns, so they are allowed as long as the time field stays in the output.
const ROW_CHANGING_COMMANDS = new Set(['stats', 'promql', 'fork']);
const INTERVAL_UNITS_MS: Readonly<Record<string, number>> = {
  millisecond: 1,
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export const ACTIVITY_INVESTIGATION_CONFIG = Object.freeze({
  // The buckets of Discover's histogram; B was validated on 48 half-hour buckets of a 24-hour view.
  minCompleteBuckets: 24,
  // A computational guard on B's cost (every interval, 999 replicates), not a requirement of B.
  maxCompleteBuckets: 100,
  // Analyze the whole field or skip it; never substitute only its most frequent values (computational limit).
  maxGroupsPerField: 100,
  // Distinct fields shown; the analysis stops once they are found.
  maxFields: 10,
  timeoutMs: 60_000,
  refreshIntervalMs: 30_000,
  detector: ACTIVITY_INTERVAL_DETECTOR_CONFIG,
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
  /** Row counts, or the per-bucket sum of the numeric `metricField`. */
  readonly metric: 'query_result_count' | 'field_sum';
  readonly metricField?: string;
  readonly buckets: readonly ActivityBucket[];
  readonly increase: ActivityIncrease;
}

export interface ActivityInvestigationResponse {
  readonly results: readonly ActivityInvestigationResult[];
  readonly groupAnalysisIncomplete: boolean;
  /** Why the view could not be compared with its history, when it could not. */
  readonly unassessableReason?: string;
  readonly historyStartTimeMs?: number;
}

interface SeriesCandidate {
  readonly series: Omit<ActivityInvestigationResult, 'increase'>;
  readonly increase: ActivityIncrease;
}

const parseIntervalMs = (interval: string): number | undefined => {
  const [amount, unit] = interval.split(' ');
  const unitMs = INTERVAL_UNITS_MS[unit];

  return unitMs ? Number(amount) * unitMs : undefined;
};

const yieldToBrowser = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const compareCandidates = (left: ActivityIncrease, right: ActivityIncrease): number => {
  if (left.pvalue !== undefined && right.pvalue !== undefined) return left.pvalue - right.pvalue;
  return (right.historicalComparison?.score ?? 0) - (left.historicalComparison?.score ?? 0);
};

/** Analyzes a frozen Discover context with B, on the total and on the groups of the query's output fields. */
export const fetchActivityInvestigation = async (
  input: ActivityInvestigationContext,
  { data, uiSettings }: Pick<DiscoverServices, 'data' | 'uiSettings'>,
  abortSignal: AbortSignal,
  { recommendedFields = [] }: { recommendedFields?: readonly string[] } = {}
): Promise<ActivityInvestigationResponse | undefined> => {
  const context = cloneDeep(input);
  const asOfMs = Date.now();
  const { query, timeFieldName, timeRange, filters, esqlVariables } = context;
  const commands = Parser.parse(query.esql).root.commands;
  const fromMs = Date.parse(timeRange.from);
  const toMs = Date.parse(timeRange.to);
  if (
    !Number.isSafeInteger(fromMs) ||
    !Number.isSafeInteger(toMs) ||
    fromMs >= toMs ||
    commands.some(({ name }) => ROW_CHANGING_COMMANDS.has(name))
  ) {
    return undefined;
  }

  const interval = computeInterval(timeRange, data);
  const intervalMs = parseIntervalMs(interval);
  // A range like "Today" can end in the future. Only use buckets that have already finished.
  const completeToMs = Math.min(toMs, asOfMs);
  if (
    !intervalMs ||
    Math.floor((completeToMs - fromMs) / intervalMs) < ACTIVITY_INVESTIGATION_CONFIG.minCompleteBuckets
  ) {
    return undefined;
  }

  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timeZone = esQueryConfig.dateFormatTZ
    ? getTimeZoneFromSettings(esQueryConfig.dateFormatTZ)
    : 'UTC';
  deepFreeze(context);

  const checkResponse = ({
    rawResponse,
    warning,
  }: {
    rawResponse: IEsqlSearchResult['rawResponse'];
    warning?: string;
  }): void => {
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
      throw new Error(
        warning
          ? `Activity investigation query warning: ${warning}`
          : 'Incomplete activity investigation response'
      );
    }
  };

  // Runs a query on the view, or on one reference window with the same filters and named time parameters.
  const execute = async (queryText: string, window?: TimeWindow) => {
    abortSignal.throwIfAborted();
    const windowRange = window
      ? { from: new Date(window.fromMs).toISOString(), to: new Date(window.toMs).toISOString() }
      : timeRange;
    const timeFilter = getTime(undefined, windowRange, { fieldName: timeFieldName });
    if (!timeFilter) throw new Error('Cannot build the activity investigation time filter');
    const preparedQuery = fixESQLQueryWithVariables(queryText, esqlVariables);
    const request: IEsqlSearchParams = {
      query: preparedQuery,
      filter: buildEsQuery(undefined, [], [...filters, timeFilter], esQueryConfig),
      params: getNamedParams(preparedQuery, windowRange, esqlVariables),
      timeZone,
    };
    deepFreeze(request);
    const response = await data.search.esql(cloneDeep(request), {
      abortSignal,
      projectRouting: context.projectRouting,
      approximation: false,
      dropNullColumns: false,
      includeExecutionMetadata: true,
    });
    checkResponse(response);

    return { request, rawResponse: response.rawResponse };
  };

  // Both the candidates and the time field must belong to the query's final output.
  const { rawResponse: metadata } = await execute(appendToESQLQuery(query.esql, '| LIMIT 0'));
  if (!metadata.columns.some(({ name }) => name === timeFieldName)) {
    return { results: [], groupAnalysisIncomplete: false, unassessableReason: 'missing-time-field' };
  }

  // Same preparation as LensVisService.getESQLHistogramQuery, without changing that shared path. In particular,
  // the user's LIMIT remains before STATS.
  const histogramQuery = appendToESQLQuery(
    convertTimeseriesCommandToFrom(query.esql),
    `| STATS results = COUNT(*) BY timestamp = BUCKET(${formatEsqlIdentifier(
      timeFieldName
    )}, ${intervalMs / 1000} seconds)`
  );
  // Ask for one extra bucket. If it comes back, reject the result rather than treating a truncated response as
  // complete.
  const maxRows = Math.ceil((toMs - fromMs) / intervalMs) + 2;
  const analysisQuery = appendToESQLQuery(histogramQuery, `| LIMIT ${maxRows + 1}`);
  const readCounts = (
    rawResponse: IEsqlSearchResult['rawResponse'],
    anchorMs: number | undefined,
    bounds: TimeWindow
  ): Map<number, number> | undefined => {
    const { columns, values } = rawResponse;
    if (values.length > maxRows) return undefined;
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
        counts.has(start) ||
        start + intervalMs <= bounds.fromMs ||
        start > bounds.toMs ||
        (anchorMs !== undefined && (start - anchorMs) % intervalMs !== 0)
      ) {
        return undefined;
      }
      counts.set(start, count);
    }

    return counts;
  };

  const { request, rawResponse } = await execute(analysisQuery);
  const counts = readCounts(rawResponse, undefined, { fromMs, toMs });
  if (!counts) return undefined;
  // Use the returned bucket alignment (including the query's time zone), and fill gaps only after the complete
  // response has passed the quality checks.
  const anchor = counts.keys().next().value ?? fromMs;
  if ([...counts.keys()].some((start) => (start - anchor) % intervalMs !== 0)) return undefined;
  const first = anchor + Math.ceil((fromMs - anchor) / intervalMs) * intervalMs;
  const end = anchor + Math.floor((completeToMs - anchor) / intervalMs) * intervalMs;
  const buckets: ActivityBucket[] = [];
  for (let start = first; start < end; start += intervalMs) {
    buckets.push({ startTimeMs: start, endTimeMs: start + intervalMs, count: counts.get(start) ?? 0 });
  }
  const total = buckets.reduce((sum, { count }) => sum + count, 0);
  if (
    buckets.length < ACTIVITY_INVESTIGATION_CONFIG.minCompleteBuckets ||
    buckets.length > ACTIVITY_INVESTIGATION_CONFIG.maxCompleteBuckets ||
    abortSignal.aborted ||
    !Number.isSafeInteger(total)
  ) {
    return undefined;
  }
  if (total === 0) return { results: [], groupAnalysisIncomplete: false };

  // History: the depth of the sources decides weekly or daily before the detector runs.
  const sources = getIndexPatternFromESQLQuery(query.esql);
  const earliestResponse = await data.search.esql(
    {
      query: `FROM ${sources} | STATS earliest = MIN(${formatEsqlIdentifier(timeFieldName)}) | LIMIT 2`,
      timeZone,
    },
    {
      abortSignal,
      projectRouting: context.projectRouting,
      approximation: false,
      dropNullColumns: false,
      includeExecutionMetadata: true,
    }
  );
  checkResponse(earliestResponse);
  if (earliestResponse.rawResponse.values.length !== 1) {
    throw new Error('Expected one row for the source history start');
  }
  const [[earliestValue] = []] = earliestResponse.rawResponse.values;
  const earliestMs =
    typeof earliestValue === 'string'
      ? Date.parse(earliestValue)
      : typeof earliestValue === 'number'
      ? earliestValue
      : Number.NaN;
  const view = { fromMs: first, toMs: end };
  const plan = planActivityHistory({
    view,
    timeZone,
    earliestMs: Number.isFinite(earliestMs) ? earliestMs : null,
  });
  if (!Number.isFinite(earliestMs)) {
    return { results: [], groupAnalysisIncomplete: false, unassessableReason: 'insufficient-history' };
  }
  const exploratoryWindow =
    plan.status === 'ready'
      ? undefined
      : planExploratoryHistory({ view, earliestMs, intervalMs, timeZone });
  const referenceWindows =
    plan.status === 'ready' ? plan.references : exploratoryWindow ? [exploratoryWindow] : [];
  const dailyReference = createDailyReferenceLookup({
    buckets,
    historyWindow: exploratoryWindow,
    earliestMs,
    timeZone,
  });

  const referenceTotals: number[][] = [];
  for (const window of referenceWindows) {
    const reference = await execute(analysisQuery, window);
    const windowCounts = readCounts(reference.rawResponse, window.fromMs, window);
    if (!windowCounts) {
      return { results: [], groupAnalysisIncomplete: false, unassessableReason: 'misaligned' };
    }
    referenceTotals.push(
      Array.from(
        { length: Math.round((window.toMs - window.fromMs) / intervalMs) },
        (_, index) => windowCounts.get(window.fromMs + index * intervalMs) ?? 0
      )
    );
  }

  const seedBase = JSON.stringify([
    ACTIVITY_INTERVAL_DETECTOR_CONFIG.version,
    query.esql,
    filters,
    view,
    timeZone,
    plan.status === 'ready' ? plan.mode : 'exploratory',
  ]);
  let totalUnassessableReason: string | undefined;
  let unassessableFields = false;
  // B on one series; the admitted interval becomes the increase shown by the selector and the chat.
  const detect = async (
    id: string,
    seriesBuckets: readonly ActivityBucket[],
    references: readonly (readonly number[])[],
    kind: 'counts' | 'sums' = 'counts'
  ): Promise<ActivityIncrease | undefined> => {
    await yieldToBrowser();
    abortSignal.throwIfAborted();
    if (plan.status !== 'ready') {
      const detection = detectExploratoryActivityInterval({
        current: seriesBuckets.map(({ count }) => count),
        history: references[0] ?? [],
        lookup: dailyReference,
        kind,
      });
      if (detection.status === 'unassessable') {
        if (id === TOTAL_ACTIVITY_RESULT_ID) totalUnassessableReason = 'insufficient-history';
        else unassessableFields = true;
      }
      if (detection.status !== 'admitted') return undefined;
      const { candidate, comparison, historicalTotal, score } = detection;
      const bucketCount = candidate.end - candidate.start;
      return {
        kind: 'exploratory_interval',
        startTimeMs: seriesBuckets[candidate.start].startTimeMs,
        endTimeMs: seriesBuckets[candidate.end - 1].endTimeMs,
        intervalMs,
        bucketCount,
        baseline: candidate.referenceMean,
        observedMean: candidate.observed / bucketCount,
        observedTotal: candidate.observed,
        excess: candidate.excess,
        percentageChange: candidate.relativeIncrease * 100,
        referenceTimeRange: {
          startTimeMs: seriesBuckets[candidate.reference.start].startTimeMs,
          endTimeMs: seriesBuckets[candidate.reference.end - 1].endTimeMs,
        },
        historicalComparison: {
          startTimeMs: comparison.fromMs,
          endTimeMs: comparison.toMs,
          observedTotal: historicalTotal,
          daysAgo: comparison.daysAgo,
          score,
        },
      };
    }
    const detection = detectActivityInterval({
      current: seriesBuckets.map(({ count }) => count),
      references,
      random: createSeededRandom(`${seedBase}|${id}`),
      earlyStop: true,
      kind,
    });
    if (detection.status === 'unassessable') {
      if (id === TOTAL_ACTIVITY_RESULT_ID) totalUnassessableReason = detection.reason;
      else unassessableFields = true;
      return undefined;
    }
    if (detection.status !== 'admitted') return undefined;
    const { interval: found, candidate, p, replicates, version } = detection;
    const bucketCount = found.end - found.start;

    return {
      kind: 'historical_interval',
      pvalue: p,
      startTimeMs: seriesBuckets[found.start].startTimeMs,
      endTimeMs: seriesBuckets[found.end - 1].endTimeMs,
      intervalMs,
      bucketCount,
      baseline: candidate.referenceMean,
      observedMean: candidate.observed / bucketCount,
      observedTotal: candidate.observed,
      excess: candidate.excess,
      percentageChange: candidate.relativeIncrease * 100,
      referenceTimeRange: {
        startTimeMs: seriesBuckets[candidate.reference.start].startTimeMs,
        endTimeMs: seriesBuckets[candidate.reference.end - 1].endTimeMs,
      },
      history: {
        mode: plan.mode,
        spacing: plan.spacing,
        references: plan.references.map(({ fromMs: startTimeMs, toMs: endTimeMs }) => ({
          startTimeMs,
          endTimeMs,
        })),
        expected: candidate.historical?.expected ?? 0,
        replicates,
        version,
      },
    };
  };

  const totalSeries: Omit<ActivityInvestigationResult, 'increase'> = {
    id: TOTAL_ACTIVITY_RESULT_ID,
    context,
    request,
    asOfMs,
    metric: 'query_result_count',
    buckets,
  };
  const totalIncrease = await detect(TOTAL_ACTIVITY_RESULT_ID, buckets, referenceTotals);

  const toGroupResult = (
    group: ActivityGroupSeries,
    id: string
  ): Omit<ActivityInvestigationResult, 'increase'> => ({
    id,
    actor: group.actor,
    context: { ...context, query: { ...context.query, esql: group.query } },
    request: group.request,
    asOfMs,
    metric: 'query_result_count',
    buckets: group.buckets,
  });
  const toSumResult = (
    sums: ActivitySumSeries,
    id: string
  ): Omit<ActivityInvestigationResult, 'increase'> => ({
    id,
    context,
    request: sums.request,
    asOfMs,
    metric: 'field_sum',
    metricField: sums.field,
    buckets: sums.buckets,
  });

  // Prioritize query intent, then profile recommendations, then other fields if places remain.
  // KEEP and DROP still delimit the pool through the query's output columns.
  const queryFields = getActivityQueryFields(commands, metadata.columns);
  const recommended = new Set(recommendedFields);
  const fieldTier = (name: string): number =>
    queryFields.has(name) ? 0 : recommended.has(name) ? 1 : 2;
  const fields = selectActivityGroupFields(metadata.columns, recommendedFields);
  const sumFields = selectActivitySumFields(metadata.columns, recommendedFields);
  const tiers = [0, 1, 2].map((tier) => ({
    groups: fields.filter(({ name }) => fieldTier(name) === tier),
    sums: sumFields.filter(({ name }) => fieldTier(name) === tier),
  }));
  const shown: SeriesCandidate[] = [];
  let groupsComplete = true;
  for (const tier of tiers) {
    if (shown.length >= ACTIVITY_INVESTIGATION_CONFIG.maxFields) break;
    if (!tier.groups.length && !tier.sums.length) continue;
    const collected = await collectActivityGroups({
      query: query.esql,
      timeFieldName,
      buckets,
      fromMs,
      toMs,
      maxGroups: ACTIVITY_INVESTIGATION_CONFIG.maxGroupsPerField,
      fields: tier.groups,
      references: referenceWindows,
      execute,
      signal: abortSignal,
    });
    const summed = await collectActivitySums({
      query: query.esql,
      timeFieldName,
      buckets,
      fromMs,
      toMs,
      fields: tier.sums,
      references: referenceWindows,
      execute,
      signal: abortSignal,
    });
    groupsComplete = groupsComplete && collected.complete && summed.complete;
    // B orders by calibrated p; the exploratory path orders by its descriptive historical comparison.
    const bestPerField = new Map<string, SeriesCandidate>();
    for (const group of collected.series) {
      const id = JSON.stringify([group.actor.field, group.actor.value]);
      const increase = await detect(id, group.buckets, group.references);
      if (!increase) continue;
      const current = bestPerField.get(group.actor.field);
      if (!current || compareCandidates(increase, current.increase) < 0) {
        bestPerField.set(group.actor.field, { series: toGroupResult(group, id), increase });
      }
    }
    // A numeric field has one series, its sum; it takes one place like any other field.
    for (const sums of summed.series) {
      const id = JSON.stringify(['sum', sums.field]);
      const increase = await detect(id, sums.buckets, sums.references, 'sums');
      if (increase) bestPerField.set(`sum:${sums.field}`, { series: toSumResult(sums, id), increase });
    }
    shown.push(
      ...[...bestPerField.values()]
        .sort((left, right) => compareCandidates(left.increase, right.increase))
        .slice(0, ACTIVITY_INVESTIGATION_CONFIG.maxFields - shown.length)
    );
  }
  if (abortSignal.aborted) return undefined;

  const response: ActivityInvestigationResponse = {
    results: [
      ...(totalIncrease ? [{ ...totalSeries, increase: totalIncrease }] : []),
      ...shown.map(({ series, increase }) => ({ ...series, increase })),
    ],
    groupAnalysisIncomplete: !groupsComplete || unassessableFields,
    ...(plan.status !== 'ready' ? { historyStartTimeMs: earliestMs } : {}),
    ...(!totalIncrease && !shown.length && totalUnassessableReason
      ? { unassessableReason: totalUnassessableReason }
      : {}),
  };
  deepFreeze(response);

  return response;
};
