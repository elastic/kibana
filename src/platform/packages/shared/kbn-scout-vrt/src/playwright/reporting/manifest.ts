/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import type { VisualCheckpointRecord } from '../runtime/types';

export const VISUAL_REGRESSION_SCHEMA_VERSION = 1 as const;

export interface VisualRegressionTarget {
  location: string;
  arch: string;
  domain: string;
}

export type VisualRegressionManifestResult = VisualCheckpointRecord;

export interface VisualRegressionManifest {
  schemaVersion: typeof VISUAL_REGRESSION_SCHEMA_VERSION;
  runId: string;
  commitSha: string;
  branch: string;
  target: VisualRegressionTarget;
  browser: string;
  viewport?: {
    width: number;
    height: number;
  };
  packageId: string;
  results: VisualRegressionManifestResult[];
}

export type VisualRegressionManifestSeed = Omit<
  VisualRegressionManifest,
  'schemaVersion' | 'results'
>;

export interface VisualRegressionManifestSummary {
  tests: number;
  checkpoints: number;
  passed: number;
  failed: number;
  captured: number;
  updated: number;
  missingBaselines: number;
  diffs: number;
}

export type VisualRegressionRunMode = 'capture' | 'compare' | 'update-baselines';
export type VisualRegressionRunStatus = 'passed' | 'failed' | 'timedout' | 'interrupted';

export interface VisualRegressionRunManifestPackage {
  packageId: string;
  status: VisualRegressionRunStatus;
  browser: string;
  viewport?: {
    width: number;
    height: number;
  };
  manifestPath: string;
  artifactsPath: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  summary: VisualRegressionManifestSummary;
}

export interface VisualRegressionRunManifest {
  schemaVersion: typeof VISUAL_REGRESSION_SCHEMA_VERSION;
  runId: string;
  status: VisualRegressionRunStatus;
  mode: VisualRegressionRunMode;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  git: {
    commitSha: string;
    branch: string;
  };
  target: VisualRegressionTarget;
  execution: {
    packageCount: number;
    browsers: string[];
    viewports: Array<{
      width: number;
      height: number;
    }>;
  };
  summary: VisualRegressionManifestSummary;
  packages: VisualRegressionRunManifestPackage[];
}

export interface VisualRegressionRunManifestUpdate {
  existing?: VisualRegressionRunManifest;
  manifest: VisualRegressionManifest;
  packageStatus: VisualRegressionRunStatus;
  mode: VisualRegressionRunMode;
  startedAt: string;
  completedAt: string;
}

export const createVisualRegressionManifest = (
  seed: VisualRegressionManifestSeed
): VisualRegressionManifest => ({
  schemaVersion: VISUAL_REGRESSION_SCHEMA_VERSION,
  ...seed,
  results: [],
});

const createEmptySummary = (): VisualRegressionManifestSummary => ({
  tests: 0,
  checkpoints: 0,
  passed: 0,
  failed: 0,
  captured: 0,
  updated: 0,
  missingBaselines: 0,
  diffs: 0,
});

const getDurationMs = (startedAt: string, completedAt: string): number => {
  const startedAtMs = Date.parse(startedAt);
  const completedAtMs = Date.parse(completedAt);

  return Number.isNaN(startedAtMs) || Number.isNaN(completedAtMs)
    ? 0
    : Math.max(0, completedAtMs - startedAtMs);
};

const getStatusSeverity = (status: VisualRegressionRunStatus): number => {
  switch (status) {
    case 'interrupted':
      return 3;
    case 'timedout':
      return 2;
    case 'failed':
      return 1;
    case 'passed':
    default:
      return 0;
  }
};

const createPackageManifestPaths = (packageId: string) => ({
  manifestPath: path.join(packageId, 'manifest.json'),
  artifactsPath: packageId,
});

export const summarizeVisualRegressionManifest = (
  manifest: Pick<VisualRegressionManifest, 'results'>
): VisualRegressionManifestSummary => {
  const tests = new Set<string>();
  const summary = createEmptySummary();

  for (const result of manifest.results) {
    tests.add(`${result.testFile}::${result.testTitle}`);
    summary.checkpoints += 1;

    switch (result.status) {
      case 'passed':
        summary.passed += 1;
        break;
      case 'failed':
        summary.failed += 1;
        break;
      case 'captured':
        summary.captured += 1;
        break;
      case 'updated':
        summary.updated += 1;
        break;
      case 'missing-baseline':
        summary.missingBaselines += 1;
        break;
    }

    if (result.diffPath) {
      summary.diffs += 1;
    }
  }

  summary.tests = tests.size;

  return summary;
};

export const createVisualRegressionRunManifestPackage = ({
  manifest,
  packageStatus,
  startedAt,
  completedAt,
}: Omit<
  VisualRegressionRunManifestUpdate,
  'existing' | 'mode'
>): VisualRegressionRunManifestPackage => ({
  packageId: manifest.packageId,
  status: packageStatus,
  browser: manifest.browser,
  viewport: manifest.viewport,
  ...createPackageManifestPaths(manifest.packageId),
  startedAt,
  completedAt,
  durationMs: getDurationMs(startedAt, completedAt),
  summary: summarizeVisualRegressionManifest(manifest),
});

const summarizeRunPackages = (
  packages: VisualRegressionRunManifestPackage[]
): VisualRegressionManifestSummary =>
  packages.reduce<VisualRegressionManifestSummary>(
    (summary, currentPackage) => ({
      tests: summary.tests + currentPackage.summary.tests,
      checkpoints: summary.checkpoints + currentPackage.summary.checkpoints,
      passed: summary.passed + currentPackage.summary.passed,
      failed: summary.failed + currentPackage.summary.failed,
      captured: summary.captured + currentPackage.summary.captured,
      updated: summary.updated + currentPackage.summary.updated,
      missingBaselines: summary.missingBaselines + currentPackage.summary.missingBaselines,
      diffs: summary.diffs + currentPackage.summary.diffs,
    }),
    createEmptySummary()
  );

const dedupeViewports = (
  packages: VisualRegressionRunManifestPackage[]
): Array<{ width: number; height: number }> => {
  const viewports = new Map<string, { width: number; height: number }>();

  for (const currentPackage of packages) {
    if (!currentPackage.viewport) {
      continue;
    }

    const { width, height } = currentPackage.viewport;
    viewports.set(`${width}x${height}`, { width, height });
  }

  return Array.from(viewports.values()).sort(
    (left, right) => left.width - right.width || left.height - right.height
  );
};

const pickRunStatus = (packages: VisualRegressionRunManifestPackage[]): VisualRegressionRunStatus =>
  packages.reduce<VisualRegressionRunStatus>((status, currentPackage) => {
    return getStatusSeverity(currentPackage.status) > getStatusSeverity(status)
      ? currentPackage.status
      : status;
  }, 'passed');

export const upsertVisualRegressionRunManifest = ({
  existing,
  manifest,
  packageStatus,
  mode,
  startedAt,
  completedAt,
}: VisualRegressionRunManifestUpdate): VisualRegressionRunManifest => {
  const nextPackage = createVisualRegressionRunManifestPackage({
    manifest,
    packageStatus,
    startedAt,
    completedAt,
  });
  const packages = [
    ...(existing?.packages ?? []).filter(({ packageId }) => packageId !== manifest.packageId),
    nextPackage,
  ].sort((left, right) => left.packageId.localeCompare(right.packageId));
  const earliestStartedAt = packages.reduce(
    (current, currentPackage) =>
      Date.parse(currentPackage.startedAt) < Date.parse(current)
        ? currentPackage.startedAt
        : current,
    startedAt
  );
  const latestCompletedAt = packages.reduce(
    (current, currentPackage) =>
      Date.parse(currentPackage.completedAt) > Date.parse(current)
        ? currentPackage.completedAt
        : current,
    completedAt
  );

  return {
    schemaVersion: VISUAL_REGRESSION_SCHEMA_VERSION,
    runId: manifest.runId,
    status: pickRunStatus(packages),
    mode,
    startedAt: earliestStartedAt,
    completedAt: latestCompletedAt,
    durationMs: getDurationMs(earliestStartedAt, latestCompletedAt),
    git: {
      commitSha: manifest.commitSha,
      branch: manifest.branch,
    },
    target: manifest.target,
    execution: {
      packageCount: packages.length,
      browsers: Array.from(new Set(packages.map(({ browser }) => browser))).sort(),
      viewports: dedupeViewports(packages),
    },
    summary: summarizeRunPackages(packages),
    packages,
  };
};
