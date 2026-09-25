/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyzeSeries } from './analyze_series';
import { createQualityReport, scoreScenario } from './report';
import type { BenchmarkScenario } from './scenarios';
import { createSeasonalReferenceReport, measureSeasonalReference } from './seasonal_reference';
import {
  compareSeasonalResidualIntervals,
  SEASONAL_RESIDUAL_INTERVAL_CONFIG,
} from './seasonal_residual_intervals';
import { TIMEOUT_MS, type Transport } from './transport';

/** Compares seasonal references on native candidates without changing Discover's detection decisions. */
export const runSeasonalChangePoints = async (
  transport: Transport,
  emit: (record: object) => Promise<void>,
  { seed: firstSeed, seeds }: { seed: number; seeds: number }
): Promise<void> => {
  const quality = createQualityReport();
  const summary = { completed: 0, failed: 0, requests: 0 };
  await emit({ type: 'seasonal-residual-interval-configuration', ...SEASONAL_RESIDUAL_INTERVAL_CONFIG });

  for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
    for (const input of createSeasonalReferenceReport(seed)) {
      const { scenario: name, injectedPercentage, counts, evaluationWindow } = input;
      const scenario: BenchmarkScenario = {
        name: `${name}-increase-${injectedPercentage}`,
        description: 'One seasonal synthetic series; the known window is used only for scoring.',
        series: [
          {
            field: 'synthetic',
            value: name,
            counts,
            expected:
              injectedPercentage > 0
                ? {
                    ...evaluationWindow,
                    baseline: input.expectedTotal / (evaluationWindow.end - evaluationWindow.start),
                    percentage: injectedPercentage,
                  }
                : undefined,
          },
        ],
      };
      const identity = { seed, scenario: name, injectedPercentage };
      const requestStart = transport.records.length;
      await emit({ type: 'seasonal-change-point-input', ...identity, input });

      try {
        const result = await analyzeSeries({
          series: scenario.series,
          execute: async (query, signal) => {
            const requestId = ++summary.requests;
            await emit({ type: 'seasonal-change-point-request', ...identity, requestId, query });
            return transport.esql(query, signal, 'seasonal-change-point', undefined, (raw) =>
              emit({ type: 'seasonal-change-point-response', ...identity, requestId, ...raw })
            );
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          intervalMs: input.intervalMs,
          startTimeMs: Date.parse(input.startTime),
          topK: 1,
        });
        const score = scoreScenario(scenario, result.seriesResults);
        const { changePoint } = result.seriesResults[0];
        const residualComparison = compareSeasonalResidualIntervals(input, changePoint.candidates);
        const comparisons = changePoint.candidates.map((candidate, index) => {
          const seasonalReference = measureSeasonalReference(input, {
            start: candidate.startBucket,
            end: candidate.endBucket,
          });
          const candidateScore = score.groups[0].candidateScores[index];
          const residualInterval = residualComparison.intervals[index];
          // Score boundaries only; the original acceptance decision and native p-value stay untouched.
          const residualScore =
            residualInterval.status === 'assessed'
              ? scoreScenario(scenario, [
                  {
                    ...result.seriesResults[0],
                    changePoint: {
                      ...changePoint,
                      candidates: [
                        {
                          ...candidate,
                          endBucket: residualInterval.endBucket,
                          percentageChange: residualInterval.seasonalReference.percentageChange,
                        },
                      ],
                    },
                  },
                ]).groups[0].candidateScores[0]
              : null;
          return {
            reportedPoint: {
              bucket: candidate.startBucket,
              kind: candidate.kind,
              pvalue: candidate.pvalue,
            },
            estimatedInterval: candidateScore.estimatedInterval,
            score: candidateScore,
            seasonalReference,
            residualInterval,
            residualWindowErrors: residualScore
              ? {
                  intervalOverlap: residualScore.intervalOverlap,
                  startBucketError: residualScore.startBucketError,
                  endBucketError: residualScore.endBucketError,
                  percentageError: residualScore.percentageError,
                }
              : null,
            // Diagnostic disagreement only: do not turn an unknown reference into a rejection.
            detectedBelowSeasonalFloor:
              candidate.status === 'detected' && seasonalReference.status === 'assessed'
                ? seasonalReference.exceedsPercentageFloor === false
                : null,
          };
        });
        await emit({
          type: 'seasonal-change-point-comparison',
          ...identity,
          ...result,
          score,
          comparisons,
          residualSeries: residualComparison.series,
          seasonalComparisonStatus:
            comparisons.length === 0
              ? 'no-candidate-not-a-seasonal-assessment'
              : comparisons.some(({ seasonalReference }) => seasonalReference.status === 'assessed')
              ? 'has-assessed-candidates'
              : 'all-candidates-unassessable',
          requests: transport.records.slice(requestStart),
        });
        quality.add(scenario, score);
        summary.completed++;
      } catch (error) {
        quality.add(scenario, undefined);
        summary.failed++;
        await emit({
          type: 'seasonal-change-point-error',
          ...identity,
          error: String(error),
          requests: transport.records.slice(requestStart),
        });
      }
    }
  }

  await emit({
    type: 'seasonal-change-point-summary',
    ...summary,
    unchangedDetectorByScenarioAndKind: quality.summarize(),
    conclusion:
      'Seasonal references are diagnostics on unchanged detector candidates. Cycle length is supplied by each scenario, not inferred. Inspect unavailable references, missed injections and disagreements separately; no filter is promoted.',
  });
  if (summary.failed > 0) {
    throw new Error(`${summary.failed} seasonal Change Point cases failed; inspect the local report`);
  }
};
