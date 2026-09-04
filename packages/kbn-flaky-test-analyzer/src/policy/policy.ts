/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PolicySnapshot, SpecObservation, SuppressionReason } from '../report/schema';
import { DEFAULT_CONFIDENCE_Z, wilsonLowerBound } from './wilson';

/**
 * Thresholds are per-framework by necessity, not by preference: over 7 days on
 * `kibana-on-merge`, 13 Playwright spec files exceed a 3% build failure rate and no FTR, Jest,
 * or Cypress file does. A single global threshold silently scopes the system to Playwright.
 *
 * These are starting values to be calibrated against human review, not measured constants.
 */
export const DEFAULT_POLICY: PolicySnapshot = {
  lookbackDays: 7,
  // Not a statistical gate — Wilson handles sample size. This only rejects specs that have
  // barely run yet, so a brand-new file cannot be filed on its first bad afternoon.
  minBuilds: 20,
  confidenceZ: DEFAULT_CONFIDENCE_Z,
  defaultBuildFailRateThreshold: 0.03,
  buildFailRateThresholdByReporter: {
    playwright: 0.03,
    ftr: 0.005,
    jest: 0.01,
    cypress: 0.01,
  },
  pipelineSlugs: ['kibana-on-merge'],
  branches: ['main', '9.5', '9.4', '8.19'],
  maxClusters: 50,
};

export const resolveThreshold = (policy: PolicySnapshot, reporterType: string): number =>
  policy.buildFailRateThresholdByReporter[reporterType] ?? policy.defaultBuildFailRateThreshold;

export interface AdmissionResult {
  admitted: boolean;
  buildFailRate: number;
  wilsonLowerBound: number;
  threshold: number;
  reason?: SuppressionReason;
  detail?: string;
}

/**
 * Decides whether a spec's observed flakiness is strong enough to become a cluster, and returns
 * the bound either way so that suppressed specs stay explainable from the artifact alone.
 */
export const admitSpec = (spec: SpecObservation, policy: PolicySnapshot): AdmissionResult => {
  const threshold = resolveThreshold(policy, spec.reporterType);
  const buildFailRate = spec.builds > 0 ? spec.failedBuilds / spec.builds : 0;
  const bound = wilsonLowerBound(spec.failedBuilds, spec.builds, policy.confidenceZ);
  const base = { buildFailRate, wilsonLowerBound: bound, threshold };

  if (spec.fails <= 0) {
    return { ...base, admitted: false, reason: 'no-failures', detail: 'no failures in window' };
  }

  if (spec.builds < policy.minBuilds) {
    return {
      ...base,
      admitted: false,
      reason: 'below-min-builds',
      detail: `${spec.builds} builds < ${policy.minBuilds}`,
    };
  }

  if (bound <= threshold) {
    return {
      ...base,
      admitted: false,
      reason: 'below-cluster-bar',
      detail:
        `Wilson lower bound ${(bound * 100).toFixed(2)}% <= ${(threshold * 100).toFixed(2)}% ` +
        `(point estimate ${(buildFailRate * 100).toFixed(2)}% over ${spec.builds} builds)`,
    };
  }

  return { ...base, admitted: true };
};

/**
 * Splits specs on the admission bar. Callers need the admitted set before fetching test-level
 * detail, since those follow-up queries are only affordable when scoped to specific files.
 */
export const partitionSpecs = (
  specs: SpecObservation[],
  policy: PolicySnapshot
): { admitted: SpecObservation[]; rejected: SpecObservation[] } => {
  const admitted: SpecObservation[] = [];
  const rejected: SpecObservation[] = [];

  for (const spec of specs) {
    if (admitSpec(spec, policy).admitted) {
      admitted.push(spec);
    } else {
      rejected.push(spec);
    }
  }

  return { admitted, rejected };
};
