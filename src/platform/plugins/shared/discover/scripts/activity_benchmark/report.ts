/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BenchmarkScenario } from './scenarios';
import type { Candidate, SeriesResult } from './analyze_series';
import {
  ACTIVITY_INCREASE_SELECTION_CONFIG,
  compareActivityIncreases,
} from '../../common/activity_investigation/activity_increase';
import { getStrongestChangePointIncrease } from '../../common/activity_investigation/describe_activity_change_points';

interface CandidateScore {
  kind: string;
  status: Candidate['status'];
  reason?: string;
  pvalue: number;
  changePointBucket: number;
  estimatedInterval: { startBucket: number; endBucket: number };
  changePointFound: boolean;
  falseAlarm: boolean;
  intervalOverlap: number | null;
  startBucketError: number | null;
  endBucketError: number | null;
  percentageError: number | null;
}

interface Measurement {
  samples: number;
  sum: number;
  absoluteSum: number;
  maximumAbsolute: number;
}

const createMeasurement = (): Measurement => ({
  samples: 0,
  sum: 0,
  absoluteSum: 0,
  maximumAbsolute: 0,
});

const addMeasurement = (measurement: Measurement, value: number | null): void => {
  if (value === null || !Number.isFinite(value)) return;
  measurement.samples++;
  measurement.sum += value;
  measurement.absoluteSum += Math.abs(value);
  measurement.maximumAbsolute = Math.max(measurement.maximumAbsolute, Math.abs(value));
};

const summarizeMeasurement = ({ samples, sum, absoluteSum, maximumAbsolute }: Measurement) => ({
  samples,
  mean: samples > 0 ? sum / samples : null,
  meanAbsolute: samples > 0 ? absoluteSum / samples : null,
  maximumAbsolute: samples > 0 ? maximumAbsolute : null,
});

const createKindSummary = () => ({
  searchesWithSignals: 0,
  searchesWithFalseAlarms: 0,
  detectedSignals: 0,
  falseAlarmSignals: 0,
  changePointFound: 0,
  missedByTopK: 0,
  unassessableCandidates: 0,
  intervalOverlap: createMeasurement(),
  startBucketError: createMeasurement(),
  endBucketError: createMeasurement(),
  percentagePointError: createMeasurement(),
});

type KindSummary = ReturnType<typeof createKindSummary>;

interface QualityCell {
  scenario: string;
  totalSeriesCount: number;
  searches: number;
  successfulSearches: number;
  failedSearches: number;
  eligible: number;
  unassessable: number;
  searchesWithUnassessableSeries: number;
  kinds: Map<string, KindSummary>;
}

interface QualitySummary {
  scenario: string;
  totalSeriesCount: number;
  kind: string;
  searches: number;
  successfulSearches: number;
  failedSearches: number;
  totalSeriesAnalyzed: number;
  eligible: number;
  unassessable: number;
  searchesWithUnassessableSeries: number;
  searchesWithSignals: number;
  searchesWithFalseAlarms: number;
  searchFalseAlarmRate: number | null;
  detectedSignals: number;
  falseAlarmSignals: number;
  changePointFound: number;
  missedByTopK: number;
  unassessableCandidates: number;
  matchedSignalErrors: {
    intervalOverlap: ReturnType<typeof summarizeMeasurement>;
    startBucketError: ReturnType<typeof summarizeMeasurement>;
    endBucketError: ReturnType<typeof summarizeMeasurement>;
    percentagePointError: ReturnType<typeof summarizeMeasurement>;
  };
}

interface QualityReport {
  add: (scenario: BenchmarkScenario, score: ScenarioScore | undefined) => void;
  summarize: () => QualitySummary[];
}

/** Scores the whole search and keeps detection, percentage and interval errors separate. */
export const scoreScenario = (scenario: BenchmarkScenario, results: SeriesResult[]) => {
  const selected = new Map(
    results
      .flatMap((result, seriesIndex) => {
        const increase = getStrongestChangePointIncrease(result.rawChangePoint);
        return increase
          ? [
              {
                seriesIndex,
                increase,
                candidateIndex: result.rawChangePoint.candidates.findIndex(
                  (candidate) => candidate.increase === increase
                ),
              },
            ]
          : [];
      })
      .sort((left, right) => compareActivityIncreases(left.increase, right.increase))
      .slice(0, ACTIVITY_INCREASE_SELECTION_CONFIG.maxResults)
      .map(({ seriesIndex, candidateIndex }) => [seriesIndex, candidateIndex] as const)
  );
  const groups = results.map((result, index) => {
    const expected = scenario.series[index].expected;
    const eligible = expected?.percentage !== null && (expected?.percentage ?? 0) > 20;
    const candidates = result.changePoint.candidates;
    const overlap = (start: number, end: number) =>
      expected
        ? Math.max(0, Math.min(end, expected.end) - Math.max(start, expected.start)) /
          (Math.max(end, expected.end) - Math.min(start, expected.start))
        : 0;
    const best = [...candidates].sort(
      (left, right) =>
        overlap(right.startBucket, right.endBucket) - overlap(left.startBucket, left.endBucket)
    )[0];
    const detected = candidates.some(
      (candidate) =>
        candidate.status === 'detected' &&
        overlap(candidate.startBucket, candidate.endBucket) >= 0.5
    );
    const candidateScores = candidates.map((candidate): CandidateScore => {
      const intervalOverlap = overlap(candidate.startBucket, candidate.endBucket);
      return {
        kind: candidate.kind,
        status: candidate.status,
        reason: candidate.reason,
        pvalue: candidate.pvalue,
        // The adapter preserves the raw point as startBucket; only the interval end is estimated.
        changePointBucket: candidate.startBucket,
        estimatedInterval: {
          startBucket: candidate.startBucket,
          endBucket: candidate.endBucket,
        },
        changePointFound: eligible && candidate.status === 'detected' && intervalOverlap >= 0.5,
        falseAlarm: candidate.status === 'detected' && (!eligible || intervalOverlap < 0.5),
        intervalOverlap: expected ? intervalOverlap : null,
        startBucketError: expected ? candidate.startBucket - expected.start : null,
        endBucketError: expected ? candidate.endBucket - expected.end : null,
        percentageError:
          candidate.percentageChange !== null &&
          expected?.percentage !== null &&
          expected?.percentage !== undefined
            ? candidate.percentageChange - expected.percentage
            : null,
      };
    });
    const displayedCandidateIndex = selected.get(index);
    return {
      field: result.field,
      value: result.value,
      expected,
      eligible,
      selectedByTopK: result.selectedByTopK,
      candidateScores,
      displayedCandidate:
        displayedCandidateIndex === undefined ? null : candidateScores[displayedCandidateIndex],
      changePointFound: eligible && detected,
      falseAlarm: candidates.some(
        (candidate) =>
          candidate.status === 'detected' &&
          (!eligible || overlap(candidate.startBucket, candidate.endBucket) < 0.5)
      ),
      missedByTopK: eligible && detected && !result.selectedByTopK,
      intervalOverlap: best ? overlap(best.startBucket, best.endBucket) : null,
      percentageError:
        best?.percentageChange !== null &&
        best?.percentageChange !== undefined &&
        expected?.percentage !== null &&
        expected?.percentage !== undefined
          ? best.percentageChange - expected.percentage
          : null,
      unassessable: result.changePoint.status === 'unassessable',
    };
  });
  return {
    groups,
    totalSeriesCount: results.length,
    changePointSignals: groups.reduce(
      (sum, group) =>
        sum + group.candidateScores.filter((candidate) => candidate.status === 'detected').length,
      0
    ),
    eligible: groups.filter((group) => group.eligible).length,
    changePointFound: groups.filter((group) => group.changePointFound).length,
    missedByTopK: groups.filter((group) => group.missedByTopK).length,
    unassessable: groups.filter((group) => group.unassessable).length,
    searchFalseAlarm: groups.some((group) => group.falseAlarm),
    presentation: {
      displayedSignals: groups.filter((group) => group.displayedCandidate).length,
      matchedSignals: groups.filter((group) => group.displayedCandidate?.changePointFound).length,
      falseSignals: groups.filter((group) => group.displayedCandidate?.falseAlarm).length,
      searchFalseAlarm: groups.some((group) => group.displayedCandidate?.falseAlarm),
      missedEligible: groups.filter(
        (group) => group.eligible && !group.displayedCandidate?.changePointFound
      ).length,
    },
  };
};

export type ScenarioScore = ReturnType<typeof scoreScenario>;

const addKindSummary = (summary: KindSummary, score: ScenarioScore, kind: string): void => {
  let searchFalseAlarm = false;
  let searchHasSignal = false;
  for (const group of score.groups) {
    const candidates = group.candidateScores.filter(
      (candidate) => kind === 'all' || candidate.kind === kind
    );
    const detected = candidates.filter((candidate) => candidate.status === 'detected');
    const falseAlarms = candidates.filter((candidate) => candidate.falseAlarm);
    const matched = candidates
      .filter((candidate) => candidate.changePointFound)
      .sort((left, right) => (right.intervalOverlap ?? 0) - (left.intervalOverlap ?? 0))[0];
    searchHasSignal ||= detected.length > 0;
    searchFalseAlarm ||= falseAlarms.length > 0;
    summary.detectedSignals += detected.length;
    summary.falseAlarmSignals += falseAlarms.length;
    summary.unassessableCandidates += candidates.filter(
      (candidate) => candidate.status === 'unassessable'
    ).length;
    if (!matched) continue;
    summary.changePointFound++;
    summary.missedByTopK += Number(!group.selectedByTopK);
    // One best matched signal per expected group avoids counting multiple candidates as extra truth.
    addMeasurement(summary.intervalOverlap, matched.intervalOverlap);
    addMeasurement(summary.startBucketError, matched.startBucketError);
    addMeasurement(summary.endBucketError, matched.endBucketError);
    addMeasurement(summary.percentagePointError, matched.percentageError);
  }
  summary.searchesWithSignals += Number(searchHasSignal);
  summary.searchesWithFalseAlarms += Number(searchFalseAlarm);
};

/** Groups complete searches by scenario, series count and change type, excluding failures from rates. */
export const createQualityReport = (): QualityReport => {
  const cells = new Map<string, QualityCell>();
  return {
    add: (scenario, score) => {
      const key = JSON.stringify([scenario.name, scenario.series.length]);
      let cell = cells.get(key);
      if (!cell) {
        cell = {
          scenario: scenario.name,
          totalSeriesCount: scenario.series.length,
          searches: 0,
          successfulSearches: 0,
          failedSearches: 0,
          eligible: 0,
          unassessable: 0,
          searchesWithUnassessableSeries: 0,
          kinds: new Map([['all', createKindSummary()]]),
        };
        cells.set(key, cell);
      }
      cell.searches++;
      if (!score) {
        cell.failedSearches++;
        return;
      }
      cell.successfulSearches++;
      cell.eligible += score.eligible;
      cell.unassessable += score.unassessable;
      cell.searchesWithUnassessableSeries += Number(score.unassessable > 0);
      const kinds = new Set([
        'all',
        ...score.groups.flatMap((group) => group.candidateScores.map(({ kind }) => kind)),
      ]);
      for (const kind of kinds) {
        const summary = cell.kinds.get(kind) ?? createKindSummary();
        addKindSummary(summary, score, kind);
        cell.kinds.set(kind, summary);
      }
    },
    summarize: () =>
      [...cells.values()].flatMap(({ kinds, ...cell }) =>
        [...kinds.entries()].map(
          ([
            kind,
            { intervalOverlap, startBucketError, endBucketError, percentagePointError, ...counts },
          ]) => ({
            ...cell,
            kind,
            totalSeriesAnalyzed: cell.successfulSearches * cell.totalSeriesCount,
            ...counts,
            // All successful searches count, including those with no point of this type.
            searchFalseAlarmRate:
              cell.successfulSearches > 0
                ? counts.searchesWithFalseAlarms / cell.successfulSearches
                : null,
            matchedSignalErrors: {
              intervalOverlap: summarizeMeasurement(intervalOverlap),
              startBucketError: summarizeMeasurement(startBucketError),
              endBucketError: summarizeMeasurement(endBucketError),
              percentagePointError: summarizeMeasurement(percentagePointError),
            },
          })
        )
      ),
  };
};

/** Summarizes the supplied measurements; failures are reported separately, not treated as fast successes. */
export const summarizeTimes = (times: number[]) => {
  const sorted = [...times].sort((left, right) => left - right);
  const percentile = (fraction: number) =>
    sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? null;
  return { samples: times.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95) };
};
