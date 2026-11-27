/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/scout-reporting', () => ({
  getGitSHA1ForPath: jest.fn(),
  testConfig: { fromPath: jest.fn() },
}));

import { getGitSHA1ForPath, testConfig } from '@kbn/scout-reporting';
import type { PinnedConfig } from './pins';
import { getTargetCoverage, isManifestOutdated } from './targets';

const mockFromPath = testConfig.fromPath as jest.MockedFunction<typeof testConfig.fromPath>;
const mockGetGitSHA1ForPath = getGitSHA1ForPath as jest.MockedFunction<typeof getGitSHA1ForPath>;

const CONFIG_PATH = 'src/platform/plugins/shared/dashboard/test/scout/ui/playwright.config.ts';
const SPEC_A = 'src/platform/plugins/shared/dashboard/test/scout/ui/tests/a.spec.ts';
const SPEC_B = 'src/platform/plugins/shared/dashboard/test/scout/ui/tests/b.spec.ts';

const config: PinnedConfig = {
  path: CONFIG_PATH,
  module: 'dashboard',
  file: 'test/scout/ui/playwright.config.ts',
  configSet: 'default',
  category: 'ui',
  targets: ['local-stateful-classic', 'local-serverless-search'],
  hasManifest: true,
};

/** Stubs the committed manifest the picker reads; `undefined` tests means there is none */
const givenManifest = (tests?: Array<{ file: string; tags: string[] }>, sha1 = 'config-sha1') => {
  mockFromPath.mockReturnValue({
    manifest: {
      exists: Boolean(tests),
      sha1,
      tests: (tests ?? []).map(({ file, tags }) => ({ location: { file }, tags })),
    },
  } as unknown as ReturnType<typeof testConfig.fromPath>);
};

describe('getTargetCoverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers only the targets the picked specs declare', () => {
    givenManifest([
      { file: SPEC_A, tags: ['@local-stateful-classic'] },
      { file: SPEC_B, tags: ['@local-stateful-classic'] },
    ]);

    // the config also declares local-serverless-search, but neither picked spec runs on it
    expect(getTargetCoverage(config, [SPEC_A, SPEC_B])).toEqual({
      tags: ['local-stateful-classic'],
      counts: new Map([['local-stateful-classic', 2]]),
      total: 2,
      known: true,
    });
  });

  it('counts how many of the specs each target runs, widest coverage first', () => {
    givenManifest([
      { file: SPEC_A, tags: ['@local-serverless-search', '@local-stateful-classic'] },
      { file: SPEC_B, tags: ['@local-stateful-classic'] },
    ]);

    const { tags, counts, total, known } = getTargetCoverage(config, [SPEC_A, SPEC_B]);
    expect(tags).toEqual(['local-stateful-classic', 'local-serverless-search']);
    expect(counts.get('local-stateful-classic')).toBe(2);
    expect(counts.get('local-serverless-search')).toBe(1);
    expect({ total, known }).toEqual({ total: 2, known: true });
  });

  it('ignores tags that are not local targets', () => {
    givenManifest([
      {
        file: SPEC_A,
        tags: ['@cloud-stateful-classic', '@local-stateful-classic', '@svlSearch'],
      },
    ]);

    expect(getTargetCoverage(config, [SPEC_A]).tags).toEqual(['local-stateful-classic']);
  });

  it('falls back to every target of the config when there is no manifest', () => {
    givenManifest(undefined);

    expect(getTargetCoverage(config, [SPEC_A, SPEC_B])).toEqual({
      tags: config.targets,
      counts: new Map(),
      total: 2,
      known: false,
    });
  });

  it('falls back when the manifest does not list one of the picked specs', () => {
    // SPEC_B is new, so the manifest can say nothing about which targets it runs on
    givenManifest([{ file: SPEC_A, tags: ['@local-stateful-classic'] }]);

    expect(getTargetCoverage(config, [SPEC_A, SPEC_B])).toMatchObject({
      tags: config.targets,
      known: false,
    });
  });

  it('offers nothing when the manifest lists the specs but none declares a local target', () => {
    givenManifest([{ file: SPEC_A, tags: ['@cloud-stateful-classic'] }]);

    // the manifest answered: falling back to the config's targets would offer one that runs
    // none of these specs, which is the outcome the coverage check exists to prevent
    expect(getTargetCoverage(config, [SPEC_A])).toMatchObject({ tags: [], known: true });
  });

  it('does not count tests the run would grep out for an unsatisfied limit', () => {
    givenManifest([
      { file: SPEC_A, tags: ['@local-stateful-classic', '@limit/only-fips'] },
      { file: SPEC_A, tags: ['@local-serverless-search'] },
    ]);

    // without FIPS attributes the only-fips test never runs, so it earns no coverage
    expect(getTargetCoverage(config, [SPEC_A])).toMatchObject({
      tags: ['local-serverless-search'],
      known: true,
    });
  });

  it('offers nothing when every test of a spec is limited out', () => {
    givenManifest([{ file: SPEC_A, tags: ['@local-stateful-classic', '@limit/only-fips'] }]);

    expect(getTargetCoverage(config, [SPEC_A])).toMatchObject({ tags: [], known: true });
  });
});

describe('isManifestOutdated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is false when there is no manifest', async () => {
    givenManifest(undefined);

    await expect(isManifestOutdated(CONFIG_PATH)).resolves.toBe(false);
    expect(mockGetGitSHA1ForPath).not.toHaveBeenCalled();
  });

  it('is false when the manifest records the latest change to the config', async () => {
    givenManifest([], 'config-sha1');
    mockGetGitSHA1ForPath.mockResolvedValue('config-sha1');

    await expect(isManifestOutdated(CONFIG_PATH)).resolves.toBe(false);
  });

  it('is true when the config changed after the manifest was written', async () => {
    givenManifest([], 'older-sha1');
    mockGetGitSHA1ForPath.mockResolvedValue('config-sha1');

    await expect(isManifestOutdated(CONFIG_PATH)).resolves.toBe(true);
  });

  it('is false outside a git checkout, where the manifest is all there is to go on', async () => {
    givenManifest([], 'older-sha1');
    mockGetGitSHA1ForPath.mockRejectedValue(new Error('not a git repository'));

    await expect(isManifestOutdated(CONFIG_PATH)).resolves.toBe(false);
  });
});
