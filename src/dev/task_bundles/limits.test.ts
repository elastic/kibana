/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  updateTaskBundleLimits,
  validateTaskBundleLimits,
  reportTaskBundleWorkerSize,
} from './limits';
import type { TaskBundleMeasurements, TaskBundleLimits } from './limits';

const measurements: TaskBundleMeasurements = {
  floor: { pluginTask: 1000 },
  packs: { 'workflow-steps:a.ts': 500, 'workflow-steps:b.ts': 2000 },
};

describe('validateTaskBundleLimits', () => {
  it('passes when every measurement is within its limit and the file is complete and sorted', () => {
    expect(
      validateTaskBundleLimits(measurements, {
        floor: { pluginTask: 1100 },
        packs: { 'workflow-steps:a.ts': 600, 'workflow-steps:b.ts': 2200 },
      })
    ).toEqual([]);
  });

  it('reports a missing limit for a measured id', () => {
    expect(
      validateTaskBundleLimits(measurements, { floor: {}, packs: { 'workflow-steps:a.ts': 600 } })
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('floor: missing a limit for pluginTask'),
        expect.stringContaining('pack: missing a limit for workflow-steps:b.ts'),
      ])
    );
  });

  it('reports a limit with no measurement (a removed bundle or pack left behind)', () => {
    expect(
      validateTaskBundleLimits(measurements, {
        floor: { goneTask: 1, pluginTask: 1100 },
        packs: { 'workflow-steps:a.ts': 600, 'workflow-steps:b.ts': 2200 },
      })
    ).toEqual([expect.stringContaining('floor: limit for goneTask has no measurement')]);
  });

  it('reports unsorted keys', () => {
    expect(
      validateTaskBundleLimits(measurements, {
        floor: { pluginTask: 1100 },
        packs: { 'workflow-steps:b.ts': 2200, 'workflow-steps:a.ts': 600 },
      })
    ).toEqual([expect.stringContaining('pack: limits.yml keys are not sorted alphabetically')]);
  });

  it('reports a measurement over its budget', () => {
    expect(
      validateTaskBundleLimits(measurements, {
        floor: { pluginTask: 900 },
        packs: { 'workflow-steps:a.ts': 600, 'workflow-steps:b.ts': 2200 },
      })
    ).toEqual([
      expect.stringContaining('floor "pluginTask": 1000 bytes exceeds its budget of 900 bytes'),
    ]);
  });
});

describe('updateTaskBundleLimits', () => {
  it('sets a fresh limit to 110% of the measured value', () => {
    expect(updateTaskBundleLimits(measurements, {})).toEqual({
      floor: { pluginTask: 1100 },
      packs: { 'workflow-steps:a.ts': 550, 'workflow-steps:b.ts': 2200 },
    });
  });

  it('keeps a higher existing limit unchanged, so limits.yml does not churn on every run', () => {
    expect(
      updateTaskBundleLimits(measurements, {
        floor: { pluginTask: 1050 },
        packs: { 'workflow-steps:a.ts': 550, 'workflow-steps:b.ts': 2200 },
      })
    ).toEqual({
      floor: { pluginTask: 1050 },
      packs: { 'workflow-steps:a.ts': 550, 'workflow-steps:b.ts': 2200 },
    });
  });

  it('raises a limit that measures below the 110% ceiling but above the existing limit', () => {
    expect(
      updateTaskBundleLimits(measurements, {
        floor: { pluginTask: 950 },
        packs: { 'workflow-steps:a.ts': 550, 'workflow-steps:b.ts': 2200 },
      })
    ).toEqual({
      floor: { pluginTask: 1100 },
      packs: { 'workflow-steps:a.ts': 550, 'workflow-steps:b.ts': 2200 },
    });
  });

  it('refuses to raise a limit by more than maxIncreaseFraction without a human reviewing it', () => {
    expect(() =>
      updateTaskBundleLimits(
        measurements,
        {
          floor: { pluginTask: 500 },
          packs: { 'workflow-steps:a.ts': 550, 'workflow-steps:b.ts': 2200 },
        },
        { maxIncreaseFraction: 0.15 }
      )
    ).toThrow(/exceeds limit 500 by/);
  });

  it('removes a limit for a bundle or pack no longer measured', () => {
    expect(
      updateTaskBundleLimits(
        { floor: { pluginTask: 1000 }, packs: {} },
        { floor: { pluginTask: 1100 }, packs: { 'workflow-steps:gone.ts': 999 } }
      )
    ).toEqual({ floor: { pluginTask: 1100 }, packs: {} });
  });
});

describe('reportTaskBundleWorkerSize', () => {
  const limits: TaskBundleLimits = {
    floor: { pluginTask: 1000 },
    packs: { 'workflow-steps:a.ts': 500, 'workflow-steps:b.ts': 2000 },
  };

  it('sums the floor and the named packs from limits.yml', () => {
    expect(reportTaskBundleWorkerSize(limits, 'pluginTask', ['workflow-steps:a.ts'])).toEqual({
      bundle: 'pluginTask',
      floorBytes: 1000,
      packs: [{ id: 'workflow-steps:a.ts', bytes: 500 }],
      unmeasuredPackIds: [],
      totalBytes: 1500,
    });
  });

  it('reports the floor alone when no packs are selected', () => {
    expect(reportTaskBundleWorkerSize(limits, 'pluginTask', [])).toEqual({
      bundle: 'pluginTask',
      floorBytes: 1000,
      packs: [],
      unmeasuredPackIds: [],
      totalBytes: 1000,
    });
  });

  it('separates out a requested pack id limits.yml has no measurement for', () => {
    expect(
      reportTaskBundleWorkerSize(limits, 'pluginTask', [
        'workflow-steps:a.ts',
        'workflow-steps:new.ts',
      ])
    ).toEqual({
      bundle: 'pluginTask',
      floorBytes: 1000,
      packs: [{ id: 'workflow-steps:a.ts', bytes: 500 }],
      unmeasuredPackIds: ['workflow-steps:new.ts'],
      totalBytes: 1500,
    });
  });

  it('throws when the bundle itself has no floor measurement', () => {
    expect(() => reportTaskBundleWorkerSize(limits, 'unknownTask', [])).toThrow(
      /No floor measurement for bundle "unknownTask"/
    );
  });
});
