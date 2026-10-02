/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ActivityBucket,
  ActivityIncrease,
} from '../../../../../common/activity_investigation/activity_increase';
import {
  ACTIVITY_INTERVAL_DETECTOR_CONFIG,
  detectActivityInterval,
} from '../../../../../common/activity_investigation/interval_detector/detect_activity_interval';
import type {
  ActivityHistoryPlan,
  TimeWindow,
} from '../../../../../common/activity_investigation/interval_detector/history_plan';
import {
  detectExploratoryActivityInterval,
  type DailyReferenceLookup,
} from '../../../../../common/activity_investigation/interval_detector/exploratory_interval';
import { createSeededRandom } from '../../../../../common/activity_investigation/interval_detector/seeded_random';
import type { ActivityInvestigationContext } from './fetch_activity_investigation';

/** Runs the existing total detector and translates its result into a finding for Discover. */
export const detectTotalActivity = async ({
  context,
  buckets,
  intervalMs,
  view,
  timeZone,
  plan,
  referenceTotals,
  dailyReference,
  abortSignal,
}: {
  context: ActivityInvestigationContext;
  buckets: readonly ActivityBucket[];
  intervalMs: number;
  view: TimeWindow;
  timeZone: string;
  plan: ActivityHistoryPlan;
  referenceTotals: number[][];
  dailyReference: DailyReferenceLookup;
  abortSignal: AbortSignal;
}): Promise<{ increase?: ActivityIncrease; unassessableReason?: string }> => {
  const seedBase = JSON.stringify([
    ACTIVITY_INTERVAL_DETECTOR_CONFIG.version,
    context.query.esql,
    context.filters,
    view,
    timeZone,
    plan.status === 'ready' ? plan.mode : 'exploratory',
  ]);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  abortSignal.throwIfAborted();
  if (plan.status !== 'ready') {
    const detection = detectExploratoryActivityInterval({
      current: buckets.map(({ count }) => count),
      history: referenceTotals[0] ?? [],
      lookup: dailyReference,
    });
    if (detection.status === 'unassessable') {
      return { unassessableReason: 'insufficient-history' };
    }
    if (detection.status !== 'admitted') return {};
    const { candidate, comparison, historicalTotal, score } = detection;
    const bucketCount = candidate.end - candidate.start;
    return {
      increase: {
        kind: 'exploratory_interval',
        startTimeMs: buckets[candidate.start].startTimeMs,
        endTimeMs: buckets[candidate.end - 1].endTimeMs,
        intervalMs,
        bucketCount,
        baseline: candidate.referenceMean,
        observedMean: candidate.observed / bucketCount,
        observedTotal: candidate.observed,
        excess: candidate.excess,
        percentageChange: candidate.relativeIncrease * 100,
        referenceTimeRange: {
          startTimeMs: buckets[candidate.reference.start].startTimeMs,
          endTimeMs: buckets[candidate.reference.end - 1].endTimeMs,
        },
        historicalComparison: {
          startTimeMs: comparison.fromMs,
          endTimeMs: comparison.toMs,
          observedTotal: historicalTotal,
          daysAgo: comparison.daysAgo,
          score,
        },
      },
    };
  }
  const detection = detectActivityInterval({
    current: buckets.map(({ count }) => count),
    references: referenceTotals,
    random: createSeededRandom(`${seedBase}|total`),
    earlyStop: true,
  });
  if (detection.status === 'unassessable') {
    return { unassessableReason: detection.reason };
  }
  if (detection.status !== 'admitted') return {};
  const { interval: found, candidate, p, replicates, version } = detection;
  const bucketCount = found.end - found.start;

  return {
    increase: {
      kind: 'historical_interval',
      pvalue: p,
      startTimeMs: buckets[found.start].startTimeMs,
      endTimeMs: buckets[found.end - 1].endTimeMs,
      intervalMs,
      bucketCount,
      baseline: candidate.referenceMean,
      observedMean: candidate.observed / bucketCount,
      observedTotal: candidate.observed,
      excess: candidate.excess,
      percentageChange: candidate.relativeIncrease * 100,
      referenceTimeRange: {
        startTimeMs: buckets[candidate.reference.start].startTimeMs,
        endTimeMs: buckets[candidate.reference.end - 1].endTimeMs,
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
    },
  };
};
