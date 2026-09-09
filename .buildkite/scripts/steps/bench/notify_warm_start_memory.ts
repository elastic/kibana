/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import parseArgs from 'minimist';
import { BuildkiteClient, upsertComment } from '#pipeline-utils';

/**
 * SOURCE OF TRUTH: src/platform/packages/shared/kbn-core-server-benchmarks/ci_warm_start_memory/memory_regression_report.ts
 *
 * These interfaces are intentionally inlined rather than imported so that this
 * Buildkite script keeps the same minimal dependency surface as the other
 * notifiers (only `#pipeline-utils`, no Kibana package deps).
 *
 * When changing `WarmStartMemoryRegressionReport` in the canonical file above,
 * mirror the changes here.
 */
export interface WarmStartMemoryPairedMetric {
  pairCount?: number;
  meanBytes?: number;
  sampleStandardDeviationBytes?: number;
  standardErrorBytes?: number;
  baselineMeanBytes?: number;
  targetMeanBytes?: number;
}

export interface WarmStartMemoryReport {
  version: number;
  outcome: 'observed' | 'inconclusive' | 'regression';
  context?: {
    baselineCommit?: string;
    targetCommit?: string;
    baselineBuildId?: string;
    targetBuildId?: string;
  };
  protocol: {
    thresholdBytes: number;
  };
  comparison: {
    requestedPairs: number;
    attemptedPairs: number;
    validPairs: number;
  };
  tailHeapUsed: WarmStartMemoryPairedMetric;
  postForcedGcHeapUsed: WarmStartMemoryPairedMetric;
}

const COMMENT_CONTEXT = 'warm-start-memory-bench';
const ANNOTATION_CONTEXT = 'warm-start-memory-bench';
const CI_STATS_GROUP = 'warm start memory';
const PROFILING_DOCS =
  'https://github.com/elastic/kibana/blob/main/dev_docs/tutorials/performance/peak_memory_profiling.mdx';

const MIB = 1024 * 1024;

const formatMiB = (bytes: number | undefined): string =>
  typeof bytes === 'number' && Number.isFinite(bytes) ? `${(bytes / MIB).toFixed(2)} MiB` : 'n/a';

const formatSignedMiB = (bytes: number | undefined): string =>
  typeof bytes === 'number' && Number.isFinite(bytes)
    ? `${bytes >= 0 ? '+' : ''}${(bytes / MIB).toFixed(2)} MiB`
    : 'n/a';

const shortSha = (sha: string | undefined): string => (sha ? sha.slice(0, 12) : 'unknown');

function buildLink(): string {
  const url = process.env.BUILDKITE_BUILD_URL;
  return url ? `[Buildkite build](${url})` : 'the Buildkite build';
}

export function buildCommentBody(report: WarmStartMemoryReport): string | null {
  if (report.outcome !== 'regression') {
    return null;
  }

  const { postForcedGcHeapUsed: postGc, comparison, protocol, context } = report;

  return `## Warm-start memory regression detected

Starting Kibana on this PR retains **${formatSignedMiB(
    postGc.meanBytes
  )}** more heap than the merge base, above the ${formatMiB(
    protocol.thresholdBytes
  )} threshold. This is measured after a forced garbage collection, so it is retained memory rather than garbage.

| | |
|---|---|
| Mean paired delta | **${formatSignedMiB(postGc.meanBytes)}** |
| Standard deviation | ${formatMiB(postGc.sampleStandardDeviationBytes)} |
| Threshold | ${formatMiB(protocol.thresholdBytes)} |
| Baseline heap | ${formatMiB(postGc.baselineMeanBytes)} (\`${shortSha(
    context?.baselineCommit
  )}\`) |
| This PR's heap | ${formatMiB(postGc.targetMeanBytes)} (\`${shortSha(context?.targetCommit)}\`) |
| Valid pairs | ${comparison.validPairs} of ${comparison.attemptedPairs} attempted |

Common causes are new top-level imports in server code and eagerly-built schemas
(Zod or \`@kbn/config-schema\`) that could be constructed lazily instead.

See ${buildLink()} for the full log and the \`warm_start_memory_regression_report.json\`
artifact for per-pair numbers, and the [peak memory profiling guide](${PROFILING_DOCS})
for how to find what is being retained.

> [!NOTE]
> This check is non-blocking and does not affect your build status.`;
}

export function buildCiStatsMetrics(
  report: WarmStartMemoryReport
): Array<Record<string, unknown>> | null {
  // Fewer than the required number of valid pairs means the numbers are not
  // trustworthy; recording them would pollute the historical series.
  if (report.outcome === 'inconclusive') {
    return null;
  }

  const { postForcedGcHeapUsed: postGc, tailHeapUsed: tail, comparison, context } = report;

  const meta = {
    outcome: report.outcome,
    validPairs: comparison.validPairs,
    baselineCommit: context?.baselineCommit ?? '',
    targetCommit: context?.targetCommit ?? '',
  };

  const metrics = [
    { id: 'post forced gc heap delta', value: postGc.meanBytes },
    {
      id: 'post forced gc heap delta standard deviation',
      value: postGc.sampleStandardDeviationBytes,
    },
    { id: 'post forced gc heap baseline', value: postGc.baselineMeanBytes },
    { id: 'post forced gc heap target', value: postGc.targetMeanBytes },
    { id: 'tail heap delta', value: tail.meanBytes },
  ];

  // Deliberately no `limit`: ci-stats turns an exceeded limit into a PR error,
  // which would make this check blocking.
  return metrics
    .filter(({ value }) => typeof value === 'number' && Number.isFinite(value))
    .map(({ id, value }) => ({
      group: CI_STATS_GROUP,
      id,
      value: Math.round(value as number),
      meta,
    }));
}

function annotateInconclusive(report: WarmStartMemoryReport): void {
  const { comparison } = report;
  const body = `Warm-start memory comparison was inconclusive: only ${comparison.validPairs} of ${comparison.requestedPairs} required pairs completed after ${comparison.attemptedPairs} attempts. No memory comparison was made for this PR.`;

  try {
    new BuildkiteClient().setAnnotation(ANNOTATION_CONTEXT, 'warning', body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Warning: failed to annotate the build (${message})`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ['report-path', 'metrics-path'],
  });

  const reportPath = args['report-path'] ?? args._[0];
  if (!reportPath) {
    console.error('Usage: notify_warm_start_memory --report-path <file> [--metrics-path <file>]');
    process.exit(2);
  }

  if (!existsSync(reportPath)) {
    console.log(`No report found at ${reportPath}; nothing to report.`);
    return;
  }

  let report: WarmStartMemoryReport;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf-8'));
  } catch (error) {
    console.error(`Failed to parse report at ${reportPath}:`, error);
    return;
  }

  const metricsPath = args['metrics-path'];
  const metrics = buildCiStatsMetrics(report);
  if (metricsPath && metrics?.length) {
    mkdirSync(dirname(metricsPath), { recursive: true });
    writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${metrics.length} ci-stats metric(s) to ${metricsPath}`);
  }

  if (report.outcome === 'inconclusive') {
    console.log('Warm-start memory comparison was inconclusive; annotating instead of commenting.');
    annotateInconclusive(report);
    return;
  }

  const body = buildCommentBody(report);
  if (!body) {
    console.log('No warm-start memory regression; skipping PR comment.');
    return;
  }

  // Kill switch so a noisy check can be silenced without reverting the CI step.
  if (process.env.WARM_START_MEMORY_COMMENT_ENABLED !== 'true') {
    console.log('Warm-start memory regression detected, but PR comments are disabled.');
    console.log(body);
    return;
  }

  console.log('Posting warm-start memory regression comment...');
  await upsertComment({
    commentBody: body,
    commentContext: COMMENT_CONTEXT,
    clearPrevious: true,
  });
  console.log('PR comment posted successfully');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to report warm-start memory results:', error);
    process.exit(1);
  });
}
