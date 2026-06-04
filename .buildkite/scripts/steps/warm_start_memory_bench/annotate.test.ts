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

import {
  buildBaselineUnavailableAnnotation,
  buildExecutionFailureAnnotation,
  buildRegressionAnnotation,
} from './annotate';

const unavailableBaseline = (): UnavailableBaselineBuild => ({
  kind: 'unavailable',
  mergeBaseCommitSha: 'a'.repeat(40),
  attemptCount: 2,
  maxAttempts: 10,
  attempts: [
    {
      commitSha: 'a'.repeat(40),
      attempt: 1,
      outcome: 'no_build',
    },
    {
      commitSha: 'b'.repeat(40),
      attempt: 2,
      outcome: 'build_not_passed',
      buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/99',
    },
  ],
});

const regressionReport = (): WarmStartMemoryRegressionReport => ({
  metrics: {
    tailRss: {
      baselineRssBytes: 1_000_000_000,
      targetRssBytes: 1_200_000_000,
      deltaBytes: 200_000_000,
      allowedDeltaBytes: 150_000_000,
      regressed: true,
    },
    maxRss: {
      baselineRssBytes: 2_000_000_000,
      targetRssBytes: 2_500_000_000,
      deltaBytes: 500_000_000,
      allowedDeltaBytes: 300_000_000,
      regressed: true,
    },
  },
  triggeredMetrics: ['tailRss', 'maxRss'],
  context: {
    baselineCommit: 'baseline-sha',
    targetCommit: 'target-sha',
    baselineBuildId: 'baseline-build',
    targetBuildId: 'target-build',
  },
});

describe('warm start memory bench annotations', () => {
  it('describes baseline lookup failures', () => {
    const body = buildBaselineUnavailableAnnotation(unavailableBaseline());

    expect(body).toContain('Warm-start memory bench skipped');
    expect(body).toContain('kibana-on-merge');
    expect(body).toContain('no_build');
    expect(body).toContain('build_not_passed');
  });

  it('describes execution failures', () => {
    const body = buildExecutionFailureAnnotation('artifact download failed');

    expect(body).toContain('Warm-start memory bench failed');
    expect(body).toContain('artifact download failed');
  });

  it('includes Tail RSS and Max RSS regression details', () => {
    const body = buildRegressionAnnotation(regressionReport());

    expect(body).toContain('Warm-start memory regression detected');
    expect(body).toContain('Tail RSS');
    expect(body).toContain('Max RSS');
    expect(body).toContain('tailRss, maxRss');
    expect(body).toContain('baseline-sha');
    expect(body).toContain('target-sha');
  });
});
