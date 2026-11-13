/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockResolveSelectiveTestingChanges = jest.fn();
const mockGetFtrSkipModules = jest.fn();
const mockResolveSelectiveTestingContext = jest.fn();

jest.mock('./selective_changes.ts', () => ({
  resolveSelectiveTestingChanges: (...args: unknown[]) =>
    mockResolveSelectiveTestingChanges(...args),
}));
jest.mock('./selective_ftr.ts', () => ({
  getFtrSkipModules: (...args: unknown[]) => mockGetFtrSkipModules(...args),
}));
jest.mock('./selective_testing.ts', () => ({
  resolveSelectiveTestingContext: (...args: unknown[]) =>
    mockResolveSelectiveTestingContext(...args),
  filterJestUnitConfigsByAffected: (configs: string[]) => configs.slice(0, 1),
  filterJestIntegrationConfigsByAffected: () => [],
}));

import type { OnMergeSelection } from '../../on-merge/selection.ts';
import { fullSelection } from '../../on-merge/selection.ts';
import { computeOnMergeShadow } from './on_merge_shadow.ts';

const COMMIT = 'c'.repeat(40);
const BASE = 'b'.repeat(40);
const CONFIGS = {
  jestUnitConfigs: ['src/a/jest.config.js', 'src/b/jest.config.js'],
  jestIntegrationConfigs: ['src/a/jest.integration.config.js'],
  ftrConfigCount: 10,
};

const selection = (overrides: Partial<OnMergeSelection['testTypes']> = {}): OnMergeSelection => ({
  commit: COMMIT,
  base: BASE,
  baseSource: 'github-activity',
  commitCount: 2,
  testTypes: {
    scout: { mode: 'selective' },
    jestUnit: { mode: 'selective' },
    jestIntegration: { mode: 'selective' },
    ftr: { mode: 'selective' },
    ...overrides,
  },
});

describe('computeOnMergeShadow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockResolveSelectiveTestingChanges.mockReturnValue(['src/a/index.ts']);
    mockGetFtrSkipModules.mockResolvedValue(null);
    mockResolveSelectiveTestingContext.mockResolvedValue({});
  });

  it('reports the selected configs for selective test types', async () => {
    const result = await computeOnMergeShadow(selection(), CONFIGS);

    expect(mockResolveSelectiveTestingChanges).toHaveBeenCalledWith(BASE, 'on-merge');
    expect(result).toMatchObject({
      changedFiles: 1,
      jestUnit: { total: 2, selected: 1, selectedConfigs: ['src/a/jest.config.js'] },
      jestIntegration: { total: 1, selected: 0 },
      ftr: { total: 10, selected: 10, skipModules: null },
    });
  });

  it('only narrows test types whose decision is selective', async () => {
    const result = await computeOnMergeShadow(
      selection({
        jestIntegration: { mode: 'full', reason: 'ES snapshot changed' },
        ftr: { mode: 'full', reason: 'ES snapshot changed' },
      }),
      CONFIGS
    );

    expect(mockGetFtrSkipModules).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      jestUnit: { selected: 1 },
      jestIntegration: { selected: 1 },
      ftr: { selected: 10 },
    });
  });

  it('reports FTR as skipped when the diff cannot affect it', async () => {
    mockGetFtrSkipModules.mockResolvedValue(['@kbn/scout']);

    const result = await computeOnMergeShadow(selection(), CONFIGS);

    expect(result.ftr).toMatchObject({ selected: 0, skipModules: ['@kbn/scout'] });
  });

  it('skips Jest and FTR for Scout-test-only diffs', async () => {
    mockResolveSelectiveTestingChanges.mockReturnValue([
      'x-pack/platform/plugins/foo/test/scout/ui/tests/foo.spec.ts',
    ]);

    const result = await computeOnMergeShadow(selection(), CONFIGS);

    expect(mockResolveSelectiveTestingContext).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      jestUnit: { selected: 0 },
      jestIntegration: { selected: 0 },
      ftr: { selected: 0, skipModules: [] },
    });
  });

  it('keeps every config when the selection is fully full', async () => {
    const result = await computeOnMergeShadow(fullSelection(COMMIT, 'forced full run'), CONFIGS);

    expect(mockResolveSelectiveTestingChanges).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      changedFiles: null,
      jestUnit: { selected: 2, decision: { mode: 'full', reason: 'forced full run' } },
      jestIntegration: { selected: 1 },
      ftr: { selected: 10 },
    });
  });
});
