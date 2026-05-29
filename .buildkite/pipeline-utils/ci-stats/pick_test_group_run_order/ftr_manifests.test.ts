/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';

import { SOLUTION_MANIFEST_INFIX } from './const';
import { getEnabledFtrConfigs } from './ftr_manifests';

// repo root, relative to .buildkite/pipeline-utils/ci-stats/pick_test_group_run_order
const REPO_ROOT = path.resolve(__dirname, '../../../..');

describe('SOLUTION_MANIFEST_INFIX', () => {
  it('maps each solution group to its manifest filename infix', () => {
    expect(SOLUTION_MANIFEST_INFIX).toEqual({
      observability: 'oblt',
      security: 'security',
      search: 'search',
      workplaceai: 'workplace_ai',
      vectordb: 'vectordb',
    });
  });
});

describe('getEnabledFtrConfigs – solution filtering', () => {
  const originalCwd = process.cwd();

  beforeAll(() => {
    // manifest paths in the JSON index are relative to the repo root
    process.chdir(REPO_ROOT);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  const flatten = (byQueue: Map<string, string[]>) => Array.from(byQueue.values()).flat();

  it('picks up workplace_ai manifest configs when filtering by "workplaceai"', () => {
    // Regression guard: the old mapping only remapped observability→oblt, so
    // `workplaceai` silently matched no manifest (ftr_workplaceai_ vs ftr_workplace_ai_).
    const { ftrConfigsByQueue } = getEnabledFtrConfigs(undefined, ['workplaceai']);
    const configs = flatten(ftrConfigsByQueue);
    expect(configs).toContain(
      'x-pack/solutions/workplaceai/test/serverless/functional/configs/config.ts'
    );
  });

  it('returns a strict subset of the full enabled set (other solution manifests dropped)', () => {
    const all = flatten(getEnabledFtrConfigs(undefined, undefined).ftrConfigsByQueue);
    const filtered = flatten(getEnabledFtrConfigs(undefined, ['workplaceai']).ftrConfigsByQueue);

    expect(filtered.length).toBeGreaterThan(0);
    // filtering actually drops the other solutions' manifests…
    expect(filtered.length).toBeLessThan(all.length);
    // …and every retained config is part of the full enabled set
    const allSet = new Set(all);
    expect(filtered.every((c) => allSet.has(c))).toBe(true);
  });
});
