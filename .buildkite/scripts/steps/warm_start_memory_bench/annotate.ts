/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnavailableBaselineBuild } from '@kbn/core-server-benchmarks/ci_warm_start_memory/resolve_baseline_build';
import type { WarmStartMemoryRegressionReport } from '@kbn/core-server-benchmarks/ci_warm_start_memory/memory_regression_report';

import { ANNOTATION_CONTEXT } from './constants';
import { formatBytes } from './format_bytes';

export type AnnotateFn = (
  context: string,
  style: 'info' | 'success' | 'warning' | 'error',
  body: string
) => void;

export const buildBaselineUnavailableAnnotation = (
  unavailable: UnavailableBaselineBuild
): string => {
  const attemptSummary = unavailable.attempts
    .map(
      (attempt) =>
        `- attempt ${attempt.attempt} @ \`${attempt.commitSha.slice(0, 12)}\`: ${attempt.outcome}${
          attempt.buildUrl ? ` ([build](${attempt.buildUrl}))` : ''
        }`
    )
    .join('\n');

  return [
    '### Warm-start memory bench skipped',
    '',
    'No reusable baseline `kibana-on-merge` build with `kibana-default.tar.zst` was found within the merge-base ancestor window.',
    '',
    `Merge base: \`${unavailable.mergeBaseCommitSha}\``,
    `Attempts: ${unavailable.attemptCount}/${unavailable.maxAttempts}`,
    '',
    attemptSummary,
  ].join('\n');
};

export const buildExecutionFailureAnnotation = (message: string): string => {
  return ['### Warm-start memory bench failed', '', message].join('\n');
};

const formatMetricSection = (
  metricLabel: string,
  metric: WarmStartMemoryRegressionReport['metrics']['tailRss']
): string => {
  return [
    `**${metricLabel}**`,
    `- baseline: ${formatBytes(metric.baselineRssBytes)}`,
    `- target: ${formatBytes(metric.targetRssBytes)}`,
    `- delta: ${formatBytes(metric.deltaBytes)} (allowed: ${formatBytes(
      metric.allowedDeltaBytes
    )})`,
    `- regressed: ${metric.regressed ? 'yes' : 'no'}`,
  ].join('\n');
};

export const buildRegressionAnnotation = (report: WarmStartMemoryRegressionReport): string => {
  const contextLines = report.context
    ? [
        '',
        '**Context**',
        ...(report.context.baselineCommit
          ? [`- baseline commit: \`${report.context.baselineCommit}\``]
          : []),
        ...(report.context.targetCommit
          ? [`- target commit: \`${report.context.targetCommit}\``]
          : []),
        ...(report.context.baselineBuildId
          ? [`- baseline build: \`${report.context.baselineBuildId}\``]
          : []),
        ...(report.context.targetBuildId
          ? [`- target build: \`${report.context.targetBuildId}\``]
          : []),
      ]
    : [];

  return [
    '### Warm-start memory regression detected',
    '',
    `Triggered metrics: ${report.triggeredMetrics.join(', ')}`,
    '',
    formatMetricSection('Tail RSS', report.metrics.tailRss),
    '',
    formatMetricSection('Max RSS', report.metrics.maxRss),
    ...contextLines,
  ].join('\n');
};

export const annotateBaselineUnavailable = (
  unavailable: UnavailableBaselineBuild,
  annotate: AnnotateFn
): void => {
  annotate(ANNOTATION_CONTEXT, 'warning', buildBaselineUnavailableAnnotation(unavailable));
};

export const annotateExecutionFailure = (message: string, annotate: AnnotateFn): void => {
  annotate(ANNOTATION_CONTEXT, 'error', buildExecutionFailureAnnotation(message));
};

export const annotateRegression = (
  report: WarmStartMemoryRegressionReport,
  annotate: AnnotateFn
): void => {
  annotate(ANNOTATION_CONTEXT, 'error', buildRegressionAnnotation(report));
};
