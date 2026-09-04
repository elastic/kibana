/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FailureSample,
  FlakyCluster,
  FlakyTestUnit,
  Mechanism,
  PolicySnapshot,
  SpecObservation,
  Suppressed,
  TestObservation,
} from '../report/schema';
import { dominantMechanism } from '../mechanism/classify';
import { admitSpec } from '../policy/policy';

const MAX_SAMPLE_ERRORS = 3;

export const specClusterKey = (spec: {
  reporterType: string;
  pipelineSlug: string;
  filePath: string;
}): string => `spec:${spec.reporterType}:${spec.pipelineSlug}:${spec.filePath}`;

/**
 * Collapses per-branch rows into one unit per test. Branches partition the build space, so
 * summing build counts across them does not double count.
 */
export const collapseTestUnits = (observations: TestObservation[]): FlakyTestUnit[] => {
  const byTestId = new Map<string, FlakyTestUnit>();

  for (const observation of observations) {
    const existing = byTestId.get(observation.testId);

    if (!existing) {
      byTestId.set(observation.testId, {
        testId: observation.testId,
        title: observation.title,
        filePath: observation.filePath,
        reporterType: observation.reporterType,
        branches: [observation.branch],
        runs: observation.runs,
        fails: observation.fails,
        builds: observation.builds,
        failedBuilds: observation.failedBuilds,
        buildFailRate: observation.builds > 0 ? observation.failedBuilds / observation.builds : 0,
        lastSeen: observation.lastSeen,
      });
      continue;
    }

    existing.branches = [...new Set([...existing.branches, observation.branch])].sort();
    existing.runs += observation.runs;
    existing.fails += observation.fails;
    existing.builds += observation.builds;
    existing.failedBuilds += observation.failedBuilds;
    existing.buildFailRate = existing.builds > 0 ? existing.failedBuilds / existing.builds : 0;
    existing.lastSeen =
      observation.lastSeen > existing.lastSeen ? observation.lastSeen : existing.lastSeen;
  }

  return [...byTestId.values()].sort((a, b) => b.failedBuilds - a.failedBuilds);
};

const groupByFilePath = <T extends { filePath: string }>(items: T[]): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const bucket = grouped.get(item.filePath);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(item.filePath, [item]);
    }
  }

  return grouped;
};

export interface BuildSpecClustersOptions {
  specs: SpecObservation[];
  tests: TestObservation[];
  samples: FailureSample[];
  policy: PolicySnapshot;
}

export interface BuildSpecClustersResult {
  clusters: FlakyCluster[];
  suppressed: Suppressed[];
}

/**
 * Turns file-level observations into ranked spec clusters, recording every rejection so that
 * "why was there no issue for X" is answerable from the artifact alone.
 *
 * Cluster impact comes from the file-level row rather than the sum of its members: two tests in
 * one file failing in the same build is one broken build, not two.
 */
export const buildSpecClusters = ({
  specs,
  tests,
  samples,
  policy,
}: BuildSpecClustersOptions): BuildSpecClustersResult => {
  const testsByFile = groupByFilePath(tests);
  const samplesByFile = groupByFilePath(samples);

  const clusters: FlakyCluster[] = [];
  const suppressed: Suppressed[] = [];

  for (const spec of specs) {
    const admission = admitSpec(spec, policy);

    if (!admission.admitted) {
      suppressed.push({
        filePath: spec.filePath,
        reporterType: spec.reporterType,
        reason: admission.reason ?? 'below-cluster-bar',
        detail: admission.detail ?? '',
      });
      continue;
    }

    const fileSamples = samplesByFile.get(spec.filePath) ?? [];
    const mechanismBreakdown = fileSamples.reduce<Partial<Record<Mechanism, number>>>(
      (breakdown, sample) => ({
        ...breakdown,
        [sample.mechanism]: (breakdown[sample.mechanism] ?? 0) + 1,
      }),
      {}
    );

    clusters.push({
      clusterKey: specClusterKey(spec),
      type: 'spec',
      filePath: spec.filePath,
      reporterType: spec.reporterType,
      pipelineSlug: spec.pipelineSlug,
      mechanism: dominantMechanism(mechanismBreakdown),
      mechanismBreakdown,
      impact: {
        runs: spec.runs,
        fails: spec.fails,
        builds: spec.builds,
        failedBuilds: spec.failedBuilds,
        buildFailRate: admission.buildFailRate,
        wilsonLowerBound: admission.wilsonLowerBound,
        branches: spec.branches,
      },
      members: collapseTestUnits(testsByFile.get(spec.filePath) ?? []),
      sampleErrors: [...new Set(fileSamples.map((sample) => sample.errorMessage))].slice(
        0,
        MAX_SAMPLE_ERRORS
      ),
      lastSeen: spec.lastSeen,
    });
  }

  // Rank by confidence-adjusted build impact. Ranking on the point estimate instead would bury
  // the worst offender: the spec that broke 412 of 570 builds sits fifth by per-run fail rate,
  // because its 7,566 executions dilute the numerator.
  clusters.sort((a, b) => b.impact.wilsonLowerBound - a.impact.wilsonLowerBound);

  return { clusters: clusters.slice(0, policy.maxClusters), suppressed };
};
