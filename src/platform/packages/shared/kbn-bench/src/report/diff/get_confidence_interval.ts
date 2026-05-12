/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricSummary } from '../types';

export interface RunUntil {
  count: number;
  power: number;
  threshold: number;
}

export interface ConfidenceIntervalRange {
  min: number;
  max: number;
}

export interface ConfidenceInterval {
  runUntil: RunUntil | null;
  confidence: number;
  range: ConfidenceIntervalRange;
}

type CIRange = 0.995 | 0.99 | 0.975 | 0.95 | 0.9;

function getZForCi(ciRange: CIRange): number {
  // Map common CI ranges to z-scores.
  if (ciRange >= 0.995) return 2.807; // ~99.5%
  if (ciRange >= 0.99) return 2.576;
  if (ciRange >= 0.975) return 2.241; // ~97.5%
  if (ciRange >= 0.95) return 1.96;
  return 1.645;
}

function getConfidenceRange(
  left: MetricSummary,
  right: MetricSummary,
  ciRange: CIRange = 0.95
): { min: number; max: number } | null {
  const leftAvg = left.avg;
  const rightAvg = right.avg;
  const leftStd = left.stdDev;
  const rightStd = right.stdDev;
  const n1 = left.count;
  const n2 = right.count;

  if (n1 <= 1 || n2 <= 1 || leftAvg === 0 || rightAvg === 0) {
    return null;
  }

  const z = getZForCi(ciRange);
  const seLeft = leftStd / Math.sqrt(n1);
  const seRight = rightStd / Math.sqrt(n2);

  const leftLow = leftAvg - z * seLeft;
  const leftHigh = leftAvg + z * seLeft;
  const rightLow = rightAvg - z * seRight;
  const rightHigh = rightAvg + z * seRight;

  if (leftLow === 0 || leftHigh === 0) return null;

  const low = ((rightLow - leftHigh) / leftHigh) * 100;
  const high = ((rightHigh - leftLow) / leftLow) * 100;
  return { min: low, max: high };
}

/**
 * Power-based sample size planning for two independent configs (LHS, RHS).
 * Recommends required runs per side so that a two-sided α test has (1-β) power
 * to detect a practically important difference |Δ*|.
 *
 * Defaults:
 *   power = 0.80
 *   alpha = 0.05
 *   MPID = 5% of mean(LHS)
 */
function getRunUntil({
  left,
  right,
  range,
  options,
}: {
  left: MetricSummary;
  right: MetricSummary;
  range: ConfidenceIntervalRange;
  options?: {
    power?: number;
    mpid?: number;
  };
}): RunUntil | null {
  const { mpid = 0.05, power = 0.8 } = options || { mpid: undefined, power: undefined };

  // If current CI already excludes the ±mpid band around 0% change, no more runs are needed
  const mpidPct = mpid * 100;
  const ciExcludesBand = range.min > mpidPct || range.max < -mpidPct;
  if (ciExcludesBand) {
    return { count: 0, power, threshold: mpid };
  }

  // Two-sample size planning with unequal variances, equal group sizes assumed for planning
  // n >= ((z_(1-α/2) + z_(power))^2 * (σ1^2 + σ2^2)) / δ^2
  // α is implied by the CI we render (95% => α=0.05)
  const alphaZ = getZForCi(0.95);

  function getZForPower(p: number): number {
    if (p >= 0.99) return 2.326; // 99%
    if (p >= 0.95) return 1.645; // 95%
    if (p >= 0.9) return 1.282; // 90%
    if (p >= 0.8) return 0.842; // 80%
    if (p >= 0.7) return 0.524; // 70%
    return 0.842; // default to 80%
  }

  const powerZ = getZForPower(power);
  const sigma1 = left.stdDev;
  const sigma2 = right.stdDev;
  const delta = Math.abs(mpid * left.avg); // absolute minimal detectable difference

  if (!isFinite(delta) || delta <= 0) return null;

  const numerator = Math.pow(alphaZ + powerZ, 2) * (sigma1 * sigma1 + sigma2 * sigma2);
  const nRequired = Math.ceil(numerator / (delta * delta));

  // Recommend additional runs on the right side to reach planned n (keep left as-is)
  const addRight = Math.max(0, nRequired - right.count);
  return { count: addRight, power, threshold: mpid };
}

export function getConfidenceInterval(
  left: MetricSummary | null,
  right: MetricSummary | null
): ConfidenceInterval | null {
  if (!left || !right) {
    return null;
  }

  const range = getConfidenceRange(left, right, 0.95) ?? { min: 0, max: 0 };

  const runUntil = getRunUntil({ left, right, range, options: { power: 0.8, mpid: 0.01 } });

  return {
    runUntil,
    confidence: 0.95,
    range,
  };
}
