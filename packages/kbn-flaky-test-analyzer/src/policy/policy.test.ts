/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecObservation } from '../report/schema';
import { DEFAULT_POLICY, admitSpec, partitionSpecs, resolveThreshold } from './policy';

const spec = (overrides: Partial<SpecObservation> = {}): SpecObservation => ({
  filePath: 'x-pack/plugins/example/test/scout/ui/tests/example.spec.ts',
  reporterType: 'playwright',
  pipelineSlug: 'kibana-on-merge',
  runs: 1000,
  fails: 100,
  builds: 500,
  failedBuilds: 100,
  branches: 1,
  tests: 2,
  lastSeen: new Date('2026-09-03T00:00:00.000Z'),
  ...overrides,
});

describe('resolveThreshold', () => {
  it('uses the per-framework threshold when one exists', () => {
    expect(resolveThreshold(DEFAULT_POLICY, 'playwright')).toBe(0.03);
    expect(resolveThreshold(DEFAULT_POLICY, 'ftr')).toBe(0.005);
  });

  it('falls back to the default for unknown frameworks', () => {
    expect(resolveThreshold(DEFAULT_POLICY, 'vitest')).toBe(
      DEFAULT_POLICY.defaultBuildFailRateThreshold
    );
  });
});

describe('admitSpec', () => {
  it('admits a spec whose lower bound clears the bar', () => {
    const result = admitSpec(spec({ builds: 570, failedBuilds: 412 }), DEFAULT_POLICY);

    expect(result.admitted).toBe(true);
    expect(result.wilsonLowerBound).toBeCloseTo(0.6847, 3);
    expect(result.reason).toBeUndefined();
  });

  it('rejects a spec with no failures', () => {
    const result = admitSpec(spec({ fails: 0, failedBuilds: 0 }), DEFAULT_POLICY);

    expect(result.admitted).toBe(false);
    expect(result.reason).toBe('no-failures');
  });

  it('rejects a spec that has barely run', () => {
    const result = admitSpec(spec({ builds: 5, failedBuilds: 4, fails: 4 }), DEFAULT_POLICY);

    expect(result.admitted).toBe(false);
    expect(result.reason).toBe('below-min-builds');
  });

  it('rejects a rate that is above the bar but within noise', () => {
    // 5 failures in 173 builds: 2.89% observed, 1.24% lower bound.
    const result = admitSpec(spec({ builds: 173, failedBuilds: 5, fails: 10 }), DEFAULT_POLICY);

    expect(result.buildFailRate).toBeCloseTo(0.0289, 3);
    expect(result.admitted).toBe(false);
    expect(result.reason).toBe('below-cluster-bar');
    expect(result.detail).toContain('1.24%');
  });

  it('applies the stricter FTR threshold to FTR specs', () => {
    const observation = spec({ reporterType: 'ftr', builds: 1000, failedBuilds: 15, fails: 15 });

    expect(admitSpec(observation, DEFAULT_POLICY).admitted).toBe(true);
    expect(admitSpec({ ...observation, reporterType: 'playwright' }, DEFAULT_POLICY).admitted).toBe(
      false
    );
  });
});

describe('partitionSpecs', () => {
  it('splits specs on the admission bar', () => {
    const { admitted, rejected } = partitionSpecs(
      [
        spec({ filePath: 'a.spec.ts', builds: 570, failedBuilds: 412 }),
        spec({ filePath: 'b.spec.ts', builds: 173, failedBuilds: 5, fails: 10 }),
        spec({ filePath: 'c.spec.ts', builds: 5, failedBuilds: 5, fails: 5 }),
      ],
      DEFAULT_POLICY
    );

    expect(admitted.map((entry) => entry.filePath)).toEqual(['a.spec.ts']);
    expect(rejected.map((entry) => entry.filePath)).toEqual(['b.spec.ts', 'c.spec.ts']);
  });
});
