/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, ProjectRouting, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { IEsqlSearchParams } from '@kbn/search-types';
import { computeInterval } from '@kbn/visualization-utils';
import { cloneDeep } from 'lodash';
import { deepFreeze } from '@kbn/std';
import type {
  ActivityBucket,
  ActivityIncrease,
} from '../../../../../common/activity_investigation/activity_increase';
import type { ActivityInvestigationSnapshot } from '../../../../../common/activity_investigation/attachment';
import { ACTIVITY_INTERVAL_DETECTOR_CONFIG } from '../../../../../common/activity_investigation/interval_detector/detect_activity_interval';
import { getInternalIntervalCandidates } from '../../../../../common/activity_investigation/interval_detector/internal_reference';
import type { DiscoverServices } from '../../../../build_services';
import { collectActivityContributors } from './collect_activity_contributors';
import { createActivityDataSource } from './activity_investigation_data';
import { detectTotalActivity } from './detect_total_activity';

const TOTAL_ACTIVITY_RESULT_ID = 'total';
const INTERVAL_UNITS_MS: Readonly<Record<string, number>> = {
  millisecond: 1,
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export const ACTIVITY_INVESTIGATION_CONFIG = Object.freeze({
  // Start with Discover's histogram resolution; B was validated on 48 half-hour buckets.
  minCompleteBuckets: 24,
  // A computational guard on B's cost (every interval, 999 replicates), not a requirement of B.
  maxCompleteBuckets: 100,
  // Distinct descriptive fields shown alongside the one detected total.
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

const parseIntervalMs = (interval: string): number | undefined => {
  const [amount, unit] = interval.split(' ');
  const unitMs = INTERVAL_UNITS_MS[unit];

  return unitMs ? Number(amount) * unitMs : undefined;
};

/** Detects once on the total, then measures fields in that finding's fixed windows for the selector. */
export const fetchActivityInvestigation = async (
  input: ActivityInvestigationContext,
  { data, uiSettings }: Pick<DiscoverServices, 'data' | 'uiSettings'>,
  abortSignal: AbortSignal,
  { recommendedFields = [] }: { recommendedFields?: readonly string[] } = {}
): Promise<ActivityInvestigationResponse | undefined> => {
  const context = cloneDeep(input);
  const asOfMs = Date.now();
  const { timeRange } = context;
  const fromMs = Date.parse(timeRange.from);
  const toMs = Date.parse(timeRange.to);
  if (!Number.isSafeInteger(fromMs) || !Number.isSafeInteger(toMs) || fromMs >= toMs) {
    return undefined;
  }

  const interval = computeInterval(timeRange, data);
  const histogramIntervalMs = parseIntervalMs(interval);
  if (!histogramIntervalMs) return undefined;

  // Coarsen long views by a whole multiple of the histogram interval instead of rejecting them.
  const intervalMultiplier = Math.max(
    1,
    Math.ceil(
      Math.floor((toMs - fromMs) / histogramIntervalMs) /
        ACTIVITY_INVESTIGATION_CONFIG.maxCompleteBuckets
    )
  );
  const intervalMs = histogramIntervalMs * intervalMultiplier;
  // A range like "Today" can end in the future. Only use buckets that have already finished.
  const completeToMs = Math.min(toMs, asOfMs);
  if (
    Math.floor((completeToMs - fromMs) / intervalMs) <
    ACTIVITY_INVESTIGATION_CONFIG.minCompleteBuckets
  ) {
    return undefined;
  }

  deepFreeze(context);
  const source = createActivityDataSource(context, { data, uiSettings }, abortSignal, {
    intervalMs,
    completeToMs,
    minCompleteBuckets: ACTIVITY_INVESTIGATION_CONFIG.minCompleteBuckets,
    maxCompleteBuckets: ACTIVITY_INVESTIGATION_CONFIG.maxCompleteBuckets,
  });
  if (!source.supportsQuery) return undefined;
  const { timeZone } = source;
  const metadata = await source.readMetadata(recommendedFields);
  if (!metadata.hasTimeField) {
    return {
      results: [],
      groupAnalysisIncomplete: false,
      unassessableReason: 'missing-time-field',
    };
  }

  const current = await source.readTotal();
  if (!current) return undefined;
  const { request, buckets, total, view } = current;
  if (total === 0) return { results: [], groupAnalysisIncomplete: false };
  const { candidates } = getInternalIntervalCandidates(
    buckets.map(({ count }) => count),
    ACTIVITY_INTERVAL_DETECTOR_CONFIG
  );
  if (!candidates.length) return { results: [], groupAnalysisIncomplete: false };

  const history = await source.readHistory(buckets, view);
  if (history.status === 'unavailable') {
    return { results: [], groupAnalysisIncomplete: false, unassessableReason: history.reason };
  }
  const { earliestMs, plan, referenceTotals, dailyReference } = history;

  const totalSeries: Omit<ActivityInvestigationResult, 'increase'> = {
    id: TOTAL_ACTIVITY_RESULT_ID,
    context,
    request,
    asOfMs,
    metric: 'query_result_count',
    buckets,
  };
  const { increase: totalIncrease, unassessableReason } = await detectTotalActivity({
    context,
    buckets,
    intervalMs,
    view,
    timeZone,
    plan,
    referenceTotals,
    dailyReference,
    abortSignal,
  });
  if (!totalIncrease) {
    return {
      results: [],
      groupAnalysisIncomplete: false,
      ...(unassessableReason ? { unassessableReason } : {}),
      ...(plan.status !== 'ready' ? { historyStartTimeMs: earliestMs } : {}),
    };
  }

  const { measurements, complete } = await source.readContributors(
    metadata.fields,
    totalIncrease,
    ACTIVITY_INVESTIGATION_CONFIG.maxFields
  );
  const contributors = collectActivityContributors({
    measurements,
    totalIncrease,
    maxResults: ACTIVITY_INVESTIGATION_CONFIG.maxFields,
  }).map((contributor) => source.createContributorResult(totalSeries, contributor));
  if (abortSignal.aborted) return undefined;

  const response: ActivityInvestigationResponse = {
    results: [{ ...totalSeries, increase: totalIncrease }, ...contributors],
    groupAnalysisIncomplete: !complete,
    ...(plan.status !== 'ready' ? { historyStartTimeMs: earliestMs } : {}),
  };
  deepFreeze(response);

  return response;
};
