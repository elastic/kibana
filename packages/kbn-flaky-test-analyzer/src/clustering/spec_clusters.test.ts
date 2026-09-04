/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FailureSample, SpecObservation, TestObservation } from '../report/schema';
import { DEFAULT_POLICY } from '../policy/policy';
import { buildSpecClusters, collapseTestUnits, specClusterKey } from './spec_clusters';

const FILE_A = 'x-pack/plugins/a/test/scout/ui/tests/a.spec.ts';
const FILE_B = 'x-pack/plugins/b/test/scout/ui/tests/b.spec.ts';

const spec = (overrides: Partial<SpecObservation> = {}): SpecObservation => ({
  filePath: FILE_A,
  reporterType: 'playwright',
  pipelineSlug: 'kibana-on-merge',
  runs: 1000,
  fails: 200,
  builds: 500,
  failedBuilds: 150,
  branches: 1,
  tests: 2,
  lastSeen: new Date('2026-09-03T00:00:00.000Z'),
  ...overrides,
});

const testObservation = (overrides: Partial<TestObservation> = {}): TestObservation => ({
  testId: 'test-1',
  title: 'does a thing',
  filePath: FILE_A,
  reporterType: 'playwright',
  branch: 'main',
  runs: 100,
  fails: 20,
  builds: 50,
  failedBuilds: 15,
  lastSeen: new Date('2026-09-03T00:00:00.000Z'),
  ...overrides,
});

const sample = (overrides: Partial<FailureSample> = {}): FailureSample => ({
  filePath: FILE_A,
  errorMessage: 'expect(received).toEqual(expected)',
  mechanism: 'data-assertion',
  ...overrides,
});

describe('specClusterKey', () => {
  it('is stable and self-describing', () => {
    expect(
      specClusterKey({
        reporterType: 'playwright',
        pipelineSlug: 'kibana-on-merge',
        filePath: FILE_A,
      })
    ).toBe(`spec:playwright:kibana-on-merge:${FILE_A}`);
  });
});

describe('collapseTestUnits', () => {
  it('merges a test across branches without double counting', () => {
    const units = collapseTestUnits([
      testObservation({ branch: 'main', builds: 50, failedBuilds: 15, runs: 100, fails: 20 }),
      testObservation({ branch: '9.4', builds: 30, failedBuilds: 5, runs: 60, fails: 8 }),
    ]);

    expect(units).toHaveLength(1);
    expect(units[0].branches).toEqual(['9.4', 'main']);
    expect(units[0].builds).toBe(80);
    expect(units[0].failedBuilds).toBe(20);
    expect(units[0].buildFailRate).toBeCloseTo(0.25, 5);
  });

  it('keeps the most recent sighting', () => {
    const units = collapseTestUnits([
      testObservation({ branch: 'main', lastSeen: new Date('2026-09-01T00:00:00.000Z') }),
      testObservation({ branch: '9.4', lastSeen: new Date('2026-09-03T00:00:00.000Z') }),
    ]);

    expect(units[0].lastSeen).toEqual(new Date('2026-09-03T00:00:00.000Z'));
  });

  it('sorts by build impact', () => {
    const units = collapseTestUnits([
      testObservation({ testId: 'quiet', failedBuilds: 2 }),
      testObservation({ testId: 'loud', failedBuilds: 40 }),
    ]);

    expect(units.map((unit) => unit.testId)).toEqual(['loud', 'quiet']);
  });
});

describe('buildSpecClusters', () => {
  it('takes cluster impact from the spec row, not the sum of its members', () => {
    // Two tests in one file failing in the same build is one broken build, not two.
    const { clusters } = buildSpecClusters({
      specs: [spec({ builds: 500, failedBuilds: 150 })],
      tests: [
        testObservation({ testId: 'one', failedBuilds: 120 }),
        testObservation({ testId: 'two', failedBuilds: 110 }),
      ],
      samples: [sample()],
      policy: DEFAULT_POLICY,
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0].impact.failedBuilds).toBe(150);
    expect(clusters[0].members).toHaveLength(2);
  });

  it('records suppressed specs with a reason instead of dropping them', () => {
    const { clusters, suppressed } = buildSpecClusters({
      specs: [spec({ filePath: FILE_B, builds: 173, failedBuilds: 5, fails: 10 })],
      tests: [],
      samples: [],
      policy: DEFAULT_POLICY,
    });

    expect(clusters).toHaveLength(0);
    expect(suppressed).toEqual([
      expect.objectContaining({ filePath: FILE_B, reason: 'below-cluster-bar' }),
    ]);
  });

  it('ranks by the lower bound rather than the point estimate', () => {
    // The diluted spec has a lower point rate but far more build impact, and must rank first.
    const { clusters } = buildSpecClusters({
      specs: [
        spec({ filePath: FILE_A, builds: 343, failedBuilds: 84, fails: 176, runs: 854 }),
        spec({ filePath: FILE_B, builds: 570, failedBuilds: 412, fails: 822, runs: 7566 }),
      ],
      tests: [],
      samples: [],
      policy: DEFAULT_POLICY,
    });

    expect(clusters.map((cluster) => cluster.filePath)).toEqual([FILE_B, FILE_A]);
    expect(clusters[0].impact.wilsonLowerBound).toBeCloseTo(0.6847, 3);
  });

  it('summarises mechanisms and surfaces the dominant one', () => {
    const { clusters } = buildSpecClusters({
      specs: [spec()],
      tests: [],
      samples: [
        sample({ mechanism: 'infra', errorMessage: 'KbnClientRequesterError: 500' }),
        sample({ mechanism: 'infra', errorMessage: 'KbnClientRequesterError: 503' }),
        sample({ mechanism: 'ui-timeout', errorMessage: 'TimeoutError: locator.click' }),
      ],
      policy: DEFAULT_POLICY,
    });

    expect(clusters[0].mechanism).toBe('infra');
    expect(clusters[0].mechanismBreakdown).toEqual({ infra: 2, 'ui-timeout': 1 });
    expect(clusters[0].sampleErrors).toHaveLength(3);
  });

  it('only attaches members and samples belonging to the cluster', () => {
    const { clusters } = buildSpecClusters({
      specs: [spec({ filePath: FILE_A })],
      tests: [
        testObservation({ testId: 'mine', filePath: FILE_A }),
        testObservation({ testId: 'theirs', filePath: FILE_B }),
      ],
      samples: [
        sample({ filePath: FILE_A, errorMessage: 'mine' }),
        sample({ filePath: FILE_B, errorMessage: 'theirs' }),
      ],
      policy: DEFAULT_POLICY,
    });

    expect(clusters[0].members.map((member) => member.testId)).toEqual(['mine']);
    expect(clusters[0].sampleErrors).toEqual(['mine']);
  });

  it('caps the number of clusters at the policy quota', () => {
    const { clusters } = buildSpecClusters({
      specs: [
        spec({ filePath: 'a.spec.ts' }),
        spec({ filePath: 'b.spec.ts' }),
        spec({ filePath: 'c.spec.ts' }),
      ],
      tests: [],
      samples: [],
      policy: { ...DEFAULT_POLICY, maxClusters: 2 },
    });

    expect(clusters).toHaveLength(2);
  });
});
