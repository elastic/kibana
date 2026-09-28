/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActivityIncrease } from '../../../../../common/activity_investigation/activity_increase';

export interface ContributorField {
  readonly name: string;
  readonly type: string;
  readonly metric: 'query_result_count' | 'field_sum';
  readonly tier: number;
}

export interface ActivityContributor {
  readonly field: ContributorField;
  readonly value?: string | boolean | null;
  readonly increase: ActivityIncrease;
}

export interface ActivityFieldMeasurement {
  readonly field: ContributorField;
  readonly value?: string | boolean | null;
  readonly observed: number;
  readonly previous: number;
}

/** Builds and ranks descriptive findings from measured counts, without querying Elasticsearch. */
export const collectActivityContributors = ({
  measurements,
  totalIncrease,
  maxResults,
}: {
  measurements: readonly ActivityFieldMeasurement[];
  totalIncrease: ActivityIncrease;
  maxResults: number;
}): ActivityContributor[] => {
  const reference = totalIncrease.referenceTimeRange;
  if (!reference) return [];
  const referenceBuckets = (reference.endTimeMs - reference.startTimeMs) / totalIncrease.intervalMs;
  const measuredIncrease = (
    observed: number,
    previous: number,
    metric: ContributorField['metric']
  ): ActivityIncrease | undefined => {
    if (![observed, previous].every((value) => Number.isFinite(value) && value >= 0)) return;
    if (metric === 'query_result_count' && ![observed, previous].every(Number.isSafeInteger))
      return;
    const baseline = previous / referenceBuckets;
    const observedMean = observed / totalIncrease.bucketCount;
    const excess = observed - baseline * totalIncrease.bucketCount;
    const percentageChange = baseline > 0 ? ((observedMean - baseline) / baseline) * 100 : null;
    if (
      excess <= 0 ||
      ![baseline, observedMean, excess].every(Number.isFinite) ||
      (percentageChange !== null && !Number.isFinite(percentageChange))
    )
      return;
    return {
      kind: metric === 'field_sum' ? 'related_metric' : 'contributor',
      startTimeMs: totalIncrease.startTimeMs,
      endTimeMs: totalIncrease.endTimeMs,
      intervalMs: totalIncrease.intervalMs,
      bucketCount: totalIncrease.bucketCount,
      referenceTimeRange: reference,
      baseline,
      observedMean,
      observedTotal: observed,
      excess,
      percentageChange,
      trigger: {
        kind: totalIncrease.kind,
        pvalue: totalIncrease.pvalue,
        observedTotal: totalIncrease.observedTotal,
        percentageChange: totalIncrease.percentageChange,
      },
    };
  };

  const best = new Map<string, ActivityContributor>();
  for (const { field, value, observed, previous } of measurements) {
    if (
      field.metric === 'query_result_count' &&
      observed === totalIncrease.observedTotal &&
      previous === Math.round(totalIncrease.baseline * referenceBuckets)
    )
      continue;
    const increase = measuredIncrease(observed, previous, field.metric);
    if (!increase || increase.excess <= (best.get(field.name)?.increase.excess ?? 0)) continue;
    best.set(field.name, { field, value, increase });
  }

  const contributors = [...best.values()].sort((left, right) => {
    if (left.field.tier !== right.field.tier) return left.field.tier - right.field.tier;
    // Counts explain the event increase; sums are related measures, never comparable in raw units.
    if (left.field.metric !== right.field.metric)
      return left.field.metric === 'query_result_count' ? -1 : 1;
    if (left.field.metric === 'query_result_count')
      return right.increase.excess - left.increase.excess;
    const leftChange = left.increase.percentageChange ?? Infinity;
    const rightChange = right.increase.percentageChange ?? Infinity;
    return leftChange === rightChange ? 0 : rightChange - leftChange;
  });
  return contributors.slice(0, maxResults);
};
