/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { buildEsQuery, getTimeZoneFromSettings } from '@kbn/es-query';
import { getEsQueryConfig, getTime } from '@kbn/data-plugin/public';
import type { IEsqlSearchParams, IEsqlSearchResult } from '@kbn/search-types';
import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  fixESQLQueryWithVariables,
  formatEsqlIdentifier,
  formatEsqlLiteral,
  formatEsqlEntityPredicate,
  getIndexPatternFromESQLQuery,
  getNamedParams,
  hasStartEndParams,
} from '@kbn/esql-utils';
import { cloneDeep } from 'lodash';
import { deepFreeze } from '@kbn/std';
import type {
  ActivityBucket,
  ActivityIncrease,
} from '../../../../../common/activity_investigation/activity_increase';
import {
  planActivityHistory,
  type ActivityHistoryPlan,
  type TimeWindow,
} from '../../../../../common/activity_investigation/interval_detector/history_plan';
import {
  createDailyReferenceLookup,
  planExploratoryHistory,
  type DailyReferenceLookup,
} from '../../../../../common/activity_investigation/interval_detector/exploratory_interval';
import type { DiscoverServices } from '../../../../build_services';
import type {
  ActivityInvestigationContext,
  ActivityInvestigationResult,
} from './fetch_activity_investigation';
import type {
  ActivityContributor,
  ActivityFieldMeasurement,
  ContributorField,
} from './collect_activity_contributors';
import { readActivityContributors } from './activity_contributor_data';
import { getActivityQueryFields } from './get_activity_query_fields';
import { selectActivityGroupFields, selectActivitySumFields } from './select_activity_group_fields';

const ROW_CHANGING_COMMANDS = new Set(['stats', 'promql', 'fork']);

type ActivityHistoryResult =
  | { status: 'unavailable'; reason: 'insufficient-history' | 'misaligned' }
  | {
      status: 'ready';
      earliestMs: number;
      plan: ActivityHistoryPlan;
      referenceTotals: number[][];
      dailyReference: DailyReferenceLookup;
    };

interface ActivityQueryResponse {
  readonly request: IEsqlSearchParams;
  readonly rawResponse: IEsqlSearchResult['rawResponse'];
}

interface ActivityTotal {
  readonly request: IEsqlSearchParams;
  readonly buckets: ActivityBucket[];
  readonly total: number;
  readonly view: TimeWindow;
}

interface ActivityDataSource {
  readonly timeZone: string;
  readonly supportsQuery: boolean;
  readMetadata: (recommendedFields: readonly string[]) => Promise<{
    hasTimeField: boolean;
    fields: ContributorField[];
  }>;
  readTotal: () => Promise<ActivityTotal | undefined>;
  readHistory: (
    buckets: readonly ActivityBucket[],
    view: TimeWindow
  ) => Promise<ActivityHistoryResult>;
  readContributors: (
    fields: readonly ContributorField[],
    totalIncrease: ActivityIncrease,
    maxResults: number
  ) => Promise<{ measurements: ActivityFieldMeasurement[]; complete: boolean }>;
  createContributorResult: (
    total: Omit<ActivityInvestigationResult, 'increase'>,
    contributor: ActivityContributor
  ) => ActivityInvestigationResult;
}

/** Reads complete current and historical histograms using the same query and filters. */
export const createActivityDataSource = (
  context: ActivityInvestigationContext,
  { data, uiSettings }: Pick<DiscoverServices, 'data' | 'uiSettings'>,
  abortSignal: AbortSignal,
  {
    intervalMs,
    completeToMs,
    minCompleteBuckets,
    maxCompleteBuckets,
  }: {
    intervalMs: number;
    completeToMs: number;
    minCompleteBuckets: number;
    maxCompleteBuckets: number;
  }
): ActivityDataSource => {
  const { query, timeFieldName, timeRange, filters, esqlVariables } = context;
  const commands = Parser.parse(query.esql).root.commands;
  const supportsQuery = !commands.some(({ name }) => ROW_CHANGING_COMMANDS.has(name));
  let outputColumns: IEsqlSearchResult['rawResponse']['columns'] = [];
  const fromMs = Date.parse(timeRange.from);
  const toMs = Date.parse(timeRange.to);
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timeZone = esQueryConfig.dateFormatTZ
    ? getTimeZoneFromSettings(esQueryConfig.dateFormatTZ)
    : 'UTC';

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
  const execute = async (
    queryText: string,
    window?: TimeWindow,
    includedWindows?: readonly TimeWindow[]
  ): Promise<ActivityQueryResponse> => {
    abortSignal.throwIfAborted();
    const windowRange = window
      ? { from: new Date(window.fromMs).toISOString(), to: new Date(window.toMs).toISOString() }
      : timeRange;
    const timeFilter = getTime(undefined, windowRange, { fieldName: timeFieldName });
    if (!timeFilter) throw new Error('Cannot build the activity investigation time filter');
    const preparedQuery = fixESQLQueryWithVariables(queryText, esqlVariables);
    const filter = buildEsQuery(undefined, [], [...filters, timeFilter], esQueryConfig);
    const request: IEsqlSearchParams = {
      query: preparedQuery,
      filter: includedWindows
        ? {
            bool: {
              filter: [
                filter,
                {
                  bool: {
                    minimum_should_match: 1,
                    should: includedWindows.map(({ fromMs: start, toMs: end }) => ({
                      range: {
                        [timeFieldName]: {
                          gte: new Date(start).toISOString(),
                          lt: new Date(end).toISOString(),
                        },
                      },
                    })),
                  },
                },
              ],
            },
          }
        : filter,
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

  const readMetadata: ActivityDataSource['readMetadata'] = async (recommendedFields) => {
    const { rawResponse: metadata } = await execute(appendToESQLQuery(query.esql, '| LIMIT 0'));
    outputColumns = metadata.columns;
    // KEEP and DROP delimit the eligible fields; explicit query intent takes priority.
    const queryFields = getActivityQueryFields(commands, metadata.columns);
    const recommended = new Set(recommendedFields);
    const fieldTier = (name: string): number =>
      queryFields.has(name) ? 0 : recommended.has(name) ? 1 : 2;
    const fields: ContributorField[] = [
      ...selectActivityGroupFields(metadata.columns, recommendedFields).map((field) => ({
        ...field,
        metric: 'query_result_count' as const,
        tier: fieldTier(field.name),
      })),
      ...selectActivitySumFields(metadata.columns, recommendedFields).map((field) => ({
        ...field,
        metric: 'field_sum' as const,
        tier: fieldTier(field.name),
      })),
    ].sort((left, right) => left.tier - right.tier);
    return { hasTimeField: metadata.columns.some(({ name }) => name === timeFieldName), fields };
  };

  // Same preparation as LensVisService.getESQLHistogramQuery, without changing that shared path. In particular,
  // the user's LIMIT remains before STATS.
  const histogramQuery = appendToESQLQuery(
    convertTimeseriesCommandToFrom(query.esql),
    `| STATS results = COUNT(*) BY timestamp = BUCKET(${formatEsqlIdentifier(timeFieldName)}, ${
      intervalMs / 1000
    } seconds)`
  );
  // Ask for one extra bucket. If it comes back, reject the result rather than treating a truncated response as
  // complete.
  const maxRows = Math.ceil((toMs - fromMs) / intervalMs) + 2;
  const analysisQuery = appendToESQLQuery(histogramQuery, `| LIMIT ${maxRows + 1}`);
  const readCounts = (
    rawResponse: IEsqlSearchResult['rawResponse'],
    anchorMs: number | undefined,
    bounds: TimeWindow,
    rowLimit = maxRows
  ): Map<number, number> | undefined => {
    const { columns, values } = rawResponse;
    if (values.length > rowLimit) return undefined;
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

  const readTotal = async (): Promise<ActivityTotal | undefined> => {
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
      buckets.push({
        startTimeMs: start,
        endTimeMs: start + intervalMs,
        count: counts.get(start) ?? 0,
      });
    }
    const total = buckets.reduce((sum, { count }) => sum + count, 0);
    if (
      buckets.length < minCompleteBuckets ||
      buckets.length > maxCompleteBuckets ||
      abortSignal.aborted ||
      !Number.isSafeInteger(total)
    ) {
      return undefined;
    }
    return { request, buckets, total, view: { fromMs: first, toMs: end } };
  };

  const readEarliestTime = async (): Promise<number> => {
    const sources = getIndexPatternFromESQLQuery(query.esql);
    const earliestResponse = await data.search.esql(
      {
        query: `FROM ${sources} | STATS earliest = MIN(${formatEsqlIdentifier(
          timeFieldName
        )}) | LIMIT 2`,
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
    return earliestMs;
  };

  const readReferenceCounts = async (
    referenceWindows: readonly TimeWindow[],
    first: number
  ): Promise<number[][] | undefined> => {
    const referenceTotals: number[][] = [];
    // Share the histogram only when batching preserves the query and the bucket grid.
    const canBatchHistory =
      referenceWindows.length > 1 &&
      commands.every(({ name }) => ['from', 'where', 'keep', 'drop'].includes(name)) &&
      !hasStartEndParams(query.esql) &&
      referenceWindows.every((window) => (window.fromMs - first) % intervalMs === 0);
    let sharedHistory: Map<number, number> | undefined;
    if (canBatchHistory) {
      const bounds = {
        fromMs: Math.min(...referenceWindows.map((window) => window.fromMs)),
        toMs: Math.max(...referenceWindows.map((window) => window.toMs)),
      };
      const rowLimit = referenceWindows.length * maxRows;
      const { rawResponse: history } = await execute(
        appendToESQLQuery(histogramQuery, `| LIMIT ${rowLimit + 1}`),
        bounds,
        referenceWindows
      );
      sharedHistory = readCounts(history, first, bounds, rowLimit);
      if (!sharedHistory) {
        return undefined;
      }
    }
    for (const window of referenceWindows) {
      const windowCounts =
        sharedHistory ??
        readCounts((await execute(analysisQuery, window)).rawResponse, window.fromMs, window);
      if (!windowCounts) {
        return undefined;
      }
      referenceTotals.push(
        Array.from(
          { length: Math.round((window.toMs - window.fromMs) / intervalMs) },
          (_, bucketIndex) => windowCounts.get(window.fromMs + bucketIndex * intervalMs) ?? 0
        )
      );
    }

    return referenceTotals;
  };

  const readHistory: ActivityDataSource['readHistory'] = async (buckets, view) => {
    // History: the depth of the sources decides weekly or daily before the detector runs.
    const earliestMs = await readEarliestTime();
    const plan = planActivityHistory({
      view,
      timeZone,
      earliestMs: Number.isFinite(earliestMs) ? earliestMs : null,
    });
    if (!Number.isFinite(earliestMs)) {
      return { status: 'unavailable', reason: 'insufficient-history' };
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

    const referenceTotals = await readReferenceCounts(referenceWindows, view.fromMs);
    if (!referenceTotals) {
      return { status: 'unavailable', reason: 'misaligned' };
    }

    return { status: 'ready', earliestMs, plan, referenceTotals, dailyReference };
  };

  const readContributors: ActivityDataSource['readContributors'] = async (
    fields,
    totalIncrease,
    maxResults
  ) => {
    try {
      return await readActivityContributors({
        query: query.esql,
        timeFieldName,
        columns: outputColumns,
        fields,
        totalIncrease,
        maxResults,
        execute,
        signal: abortSignal,
      });
    } catch {
      abortSignal.throwIfAborted();
      // A failed breakdown must not discard a successfully detected total.
      return { measurements: [], complete: false };
    }
  };

  const createContributorResult: ActivityDataSource['createContributorResult'] = (
    { request, asOfMs },
    { field, value, increase }
  ) => {
    const actor =
      field.metric === 'query_result_count'
        ? { field: field.name, value: value ?? null }
        : undefined;
    const predicate = actor
      ? actor.value === null
        ? formatEsqlEntityPredicate(field.name, null)
        : `MV_CONTAINS(${formatEsqlIdentifier(field.name)}, ${formatEsqlLiteral(actor.value)}::${
            field.type
          })`
      : undefined;
    const scopedQuery = predicate
      ? appendToESQLQuery(query.esql, `| WHERE ${predicate}`)
      : query.esql;
    const preparedQuery = fixESQLQueryWithVariables(scopedQuery, esqlVariables);
    return {
      id: JSON.stringify([field.metric, field.name, value]),
      actor,
      context: { ...context, query: { ...query, esql: scopedQuery } },
      request: {
        ...request,
        query: preparedQuery,
        params: getNamedParams(preparedQuery, timeRange, esqlVariables),
      },
      asOfMs,
      metric: field.metric,
      ...(field.metric === 'field_sum' ? { metricField: field.name } : {}),
      buckets: [],
      increase,
    };
  };

  return {
    timeZone,
    supportsQuery,
    readMetadata,
    readTotal,
    readHistory,
    readContributors,
    createContributorResult,
  };
};
