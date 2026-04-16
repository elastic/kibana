/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  VisualRegressionManifestSummary,
  VisualRegressionRunManifest,
  VisualRegressionRunStatus,
} from '@kbn/scout-vrt';

export interface PrVrtRunReport {
  status: VisualRegressionRunStatus;
  summary: VisualRegressionManifestSummary;
  runManifest: VisualRegressionRunManifest;
}

export interface PrVrtSummary {
  runs: number;
  packages: number;
  tests: number;
  checkpoints: number;
  passed: number;
  failed: number;
  updated: number;
  missingBaselines: number;
  diffs: number;
}

const statusSeverity: Record<VisualRegressionRunStatus, number> = {
  passed: 0,
  failed: 1,
  timedout: 2,
  interrupted: 3,
};

export const summarizePrVrtRuns = (runReports: PrVrtRunReport[]): PrVrtSummary =>
  runReports.reduce<PrVrtSummary>(
    (summary, currentRun) => ({
      runs: summary.runs + 1,
      packages: summary.packages + currentRun.runManifest.packages.length,
      tests: summary.tests + currentRun.summary.tests,
      checkpoints: summary.checkpoints + currentRun.summary.checkpoints,
      passed: summary.passed + currentRun.summary.passed,
      failed: summary.failed + currentRun.summary.failed,
      updated: summary.updated + currentRun.summary.updated,
      missingBaselines: summary.missingBaselines + currentRun.summary.missingBaselines,
      diffs: summary.diffs + currentRun.summary.diffs,
    }),
    {
      runs: 0,
      packages: 0,
      tests: 0,
      checkpoints: 0,
      passed: 0,
      failed: 0,
      updated: 0,
      missingBaselines: 0,
      diffs: 0,
    }
  );

export const pickPrVrtStyle = (runReports: PrVrtRunReport[]): 'success' | 'warning' | 'error' => {
  const highestSeverity = runReports.reduce<number>(
    (severity, currentRun) => Math.max(severity, statusSeverity[currentRun.status]),
    0
  );

  if (highestSeverity >= statusSeverity.timedout) {
    return 'error';
  }

  const summary = summarizePrVrtRuns(runReports);

  if (summary.failed > 0 || summary.missingBaselines > 0) {
    return 'error';
  }

  if (summary.diffs > 0) {
    return 'warning';
  }

  return 'success';
};

const pluralize = (count: number, singular: string, plural: string = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const createPrVrtAnnotation = (runReports: PrVrtRunReport[], reportUrl: string): string => {
  const summary = summarizePrVrtRuns(runReports);

  return [
    '**Visual Regression Tests**<br />',
    `Runs: ${summary.runs}<br />`,
    `Packages: ${summary.packages}<br />`,
    `Tests: ${summary.tests}<br />`,
    `Checkpoints: ${summary.checkpoints}<br />`,
    `Failed checkpoints: ${summary.failed}<br />`,
    `Missing baselines: ${summary.missingBaselines}<br />`,
    `Diff images: ${summary.diffs}<br />`,
    `<a href="${reportUrl}">Open VRT review site</a>`,
  ].join('\n');
};

export const createPrVrtCommentHead = (runReports: PrVrtRunReport[], reportUrl: string): string => {
  const summary = summarizePrVrtRuns(runReports);
  const details = [
    pluralize(summary.failed, 'failed checkpoint'),
    pluralize(summary.missingBaselines, 'missing baseline'),
    pluralize(summary.diffs, 'diff image'),
  ].join(', ');

  return `* [VRT Report](${reportUrl}) - ${details}`;
};

export const createPrVrtCommentBody = (runReports: PrVrtRunReport[], reportUrl: string): string => {
  const summary = summarizePrVrtRuns(runReports);

  return [
    '### Visual Regression Tests',
    '',
    `* [Open VRT review site](${reportUrl})`,
    `* ${pluralize(summary.runs, 'run')}`,
    `* ${pluralize(summary.packages, 'package')}`,
    `* ${pluralize(summary.tests, 'test')}`,
    `* ${pluralize(summary.checkpoints, 'checkpoint')}`,
    `* ${pluralize(summary.failed, 'failed checkpoint')}`,
    `* ${pluralize(summary.missingBaselines, 'missing baseline')}`,
    `* ${pluralize(summary.diffs, 'diff image')}`,
  ].join('\n');
};
