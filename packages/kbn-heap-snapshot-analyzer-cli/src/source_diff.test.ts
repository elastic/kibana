/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SourceSummary } from './source_diff';
import { buildSourceDiff, normalizeSourcePath } from './source_diff';

const baseline: SourceSummary = {
  snapshot: 'before.heapsnapshot',
  totalSelf: 150,
  nodeCount: 3,
  hasAllocationTracking: true,
  rows: [
    {
      source: 'node_modules/example/index.js',
      allocator: 'node:internal/modules/cjs/loader',
      package: 'example',
      nodeType: 'string',
      attribution: 'allocation',
      selfBytes: 100,
      count: 2,
    },
    {
      source: '(unattributed)',
      allocator: '(untracked)',
      package: '(unattributed)',
      nodeType: 'native',
      attribution: 'unattributed',
      selfBytes: 50,
      count: 1,
    },
  ],
};

describe('normalizeSourcePath', () => {
  it('normalizes image, repository, and file URL paths', () => {
    expect(
      normalizeSourcePath(
        'file:///usr/share/kibana/node_modules/@opentelemetry/sdk-node/build/src/index.js'
      )
    ).toBe('node_modules/@opentelemetry/sdk-node/build/src/index.js');
    expect(normalizeSourcePath('/build/kibana/x-pack/platform/test.js?cache=1')).toBe(
      'x-pack/platform/test.js'
    );
  });
});

describe('buildSourceDiff', () => {
  it('produces an additive, reconciled diff', () => {
    const current: SourceSummary = {
      snapshot: 'after.heapsnapshot',
      totalSelf: 185,
      nodeCount: 4,
      hasAllocationTracking: true,
      rows: [
        {
          ...baseline.rows[0],
          selfBytes: 140,
          count: 3,
        },
        {
          source: '(unattributed)',
          allocator: '(untracked)',
          package: '(unattributed)',
          nodeType: 'native',
          attribution: 'unattributed',
          selfBytes: 45,
          count: 1,
        },
      ],
    };

    const diff = buildSourceDiff(baseline, current);

    expect(diff.totalDeltaBytes).toBe(35);
    expect(diff.attributedDeltaBytes).toBe(35);
    expect(diff.reconciled).toBe(true);
    expect(diff.packages.map(({ deltaBytes }) => deltaBytes)).toEqual([40, -5]);
    expect(diff.rows.map(({ deltaBytes }) => deltaBytes)).toEqual([40, -5]);
  });
});
