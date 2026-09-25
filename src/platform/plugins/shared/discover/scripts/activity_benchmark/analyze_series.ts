/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACTIVITY_CHANGE_POINT_CONFIG,
  detectActivityChangePointSeries,
  describeActivityChangePoints,
  type ActivityChangePointCandidate,
  type ActivityChangePointResult,
} from '../../common/activity_investigation/describe_activity_change_points';
import {
  ACTIVITY_INCREASE_SELECTION_CONFIG,
  passesActivityIncreaseFilter,
} from '../../common/activity_investigation/activity_increase';

export {
  getChangePointBatchSize,
  type ActivityChangePointCandidate as Candidate,
} from '../../common/activity_investigation/describe_activity_change_points';

export const CHANGE_POINT_ANALYSIS_CONFIG = {
  ...ACTIVITY_CHANGE_POINT_CONFIG,
  selection: ACTIVITY_INCREASE_SELECTION_CONFIG,
  candidateStatusStage: 'after-display-filter-before-series-selection',
} as const;

const applyDisplayFilter = (result: ActivityChangePointResult): ActivityChangePointResult => {
  const candidates = result.candidates.map((candidate): ActivityChangePointCandidate => {
    if (!candidate.increase || passesActivityIncreaseFilter(candidate.increase)) return candidate;
    return {
      ...candidate,
      status: 'no-signal',
      reason: 'increase-does-not-exceed-percentage-floor',
      increase: null,
    };
  });
  return {
    ...result,
    candidates,
    status:
      result.status === 'unassessable'
        ? 'unassessable'
        : candidates.some(({ status }) => status === 'detected')
        ? 'detected'
        : candidates.some(({ status }) => status === 'unassessable')
        ? 'unassessable'
        : 'no-signal',
  };
};

/** Preserves the historical candidate scoring after Discover's separate display filter. */
export const describeChangePointCandidates = (
  ...args: Parameters<typeof describeActivityChangePoints>
): ActivityChangePointResult => applyDisplayFilter(describeActivityChangePoints(...args));

export interface BenchmarkSeries {
  field: string;
  value: string | boolean | null;
  counts: number[];
}

type Cell = string | number | boolean | null | Array<string | number | boolean | null>;
export interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: Cell[][];
}

export interface SeriesResult {
  field: string;
  value: BenchmarkSeries['value'];
  total: number;
  selectedByTopK: boolean;
  rawChangePoint: ActivityChangePointResult;
  changePoint: ActivityChangePointResult;
}

interface AnalyzeInput {
  series: BenchmarkSeries[];
  execute: (query: string, signal: AbortSignal) => Promise<EsqlResult>;
  signal: AbortSignal;
  intervalMs: number;
  startTimeMs: number;
  topK: number;
}

/** Measures the Discover Change Point detector for every field/value. */
export const analyzeSeries = async ({
  series,
  execute,
  signal,
  intervalMs,
  startTimeMs,
  topK,
}: AnalyzeInput): Promise<{
  seriesResults: SeriesResult[];
  timings: {
    changePointMs: number;
    selectionMs: number;
    changePointRequests: number;
  };
}> => {
  signal.throwIfAborted();
  if (!Number.isSafeInteger(topK) || topK < 1) throw new Error('Expected a positive top-K count');
  const identities = new Set(series.map(({ field, value }) => JSON.stringify([field, value])));
  if (identities.size !== series.length) throw new Error('Duplicate series identity');

  const changePointStart = performance.now();
  let changePointRequests = 0;
  const changePoints = await detectActivityChangePointSeries({
    series: series.map(({ counts }) => counts),
    execute: (query, innerSignal) => {
      changePointRequests++;
      return execute(query, innerSignal);
    },
    signal,
    intervalMs,
    startTimeMs,
  });
  const changePointMs = performance.now() - changePointStart;

  const selectionStart = performance.now();
  const totals = series.map(({ counts }) => counts.reduce((sum, count) => sum + count, 0));
  const fields = new Map<string, number[]>();
  series.forEach(({ field }, index) => {
    const indices = fields.get(field) ?? [];
    indices.push(index);
    fields.set(field, indices);
  });
  const selected = new Set(
    [...fields.values()].flatMap((indices) =>
      indices
        .sort(
          (left, right) =>
            totals[right] - totals[left] ||
            JSON.stringify(series[left].value).localeCompare(JSON.stringify(series[right].value))
        )
        .slice(0, topK)
    )
  );
  const seriesResults: SeriesResult[] = series.map(({ field, value }, index) => ({
    field,
    value,
    total: totals[index],
    selectedByTopK: selected.has(index),
    rawChangePoint: changePoints[index],
    changePoint: applyDisplayFilter(changePoints[index]),
  }));
  const selectionMs = performance.now() - selectionStart;
  signal.throwIfAborted();
  return {
    seriesResults,
    timings: {
      selectionMs,
      changePointMs,
      changePointRequests,
    },
  };
};
