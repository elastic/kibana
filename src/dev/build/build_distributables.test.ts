/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import type { BuildOptions } from './build_distributables';
import { buildDistributables } from './build_distributables';
import * as Tasks from './tasks';
import { runFpm } from './tasks/os_packages/run_fpm';

jest.mock('./tasks/os_packages/run_fpm', () => ({ runFpm: jest.fn() }));

jest.mock('./lib/version_info', () => ({
  getVersionInfo: () => ({
    buildSha: 'abc1234abcdef',
    buildVersion: '8.0.0',
    buildNumber: 1234,
    buildDate: '2023-05-15T23:12:09+0000',
  }),
}));

jest.mock('./tasks', () => {
  const actual = jest.requireActual('./tasks') as Record<string, unknown>;
  const mockBundleTaskRun = jest.fn().mockResolvedValue(undefined);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(actual)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'run' in value &&
      typeof value.run === 'function'
    ) {
      result[key] = {
        ...(value as object),
        run: key === 'BuildBundles' ? mockBundleTaskRun : jest.fn().mockResolvedValue(undefined),
      };
    } else {
      result[key] = value;
    }
  }

  return result;
});

const mockBundleTaskRun = Tasks.BuildBundles.run as jest.MockedFunction<
  typeof Tasks.BuildBundles.run
>;

const log = new ToolingLog();

const minimalGenericFoldersOptions: BuildOptions = {
  isRelease: false,
  dockerContextUseLocalArtifact: null,
  dockerCrossCompile: false,
  dockerNamespace: null,
  dockerPush: false,
  dockerTag: null,
  dockerTagQualifier: null,
  downloadFreshNode: false,
  downloadCloudDependencies: false,
  initialize: false,
  createGenericFolders: true,
  createPlatformFolders: false,
  createArchives: false,
  skipFips: false,
  targetFipsPlatforms: false,
  createCdnAssets: false,
  createRpmPackage: false,
  createDebPackage: false,
  createDockerUBI: false,
  createDockerWolfi: false,
  createDockerCloud: false,
  createDockerCloudFIPS: false,
  createDockerServerless: false,
  createDockerContexts: false,
  createDockerFIPS: false,
  versionQualifier: undefined,
  targetAllPlatforms: false,
  targetServerlessPlatforms: false,
  skipServerless: false,
  tarZstd: false,
  withExamplePlugins: false,
  withTestPlugins: false,
  eprRegistry: 'snapshot',
};

describe('buildDistributables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs BuildBundles once when creating generic folders', async () => {
    await buildDistributables(log, minimalGenericFoldersOptions);

    expect(mockBundleTaskRun).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: 'all Linux distributions',
      skipFips: false,
      targetFipsPlatforms: false,
      expected: ['linux-x64', 'linux-arm64', 'linux-x64-fips', 'linux-arm64-fips'],
    },
    {
      name: 'regular Linux distributions',
      skipFips: true,
      targetFipsPlatforms: false,
      expected: ['linux-x64', 'linux-arm64'],
    },
    {
      name: 'FIPS distributions only',
      skipFips: false,
      targetFipsPlatforms: true,
      expected: ['linux-x64-fips', 'linux-arm64-fips'],
    },
  ])(
    'packages the selected platforms for $name',
    async ({ skipFips, targetFipsPlatforms, expected }) => {
      await buildDistributables(log, {
        ...minimalGenericFoldersOptions,
        createGenericFolders: false,
        createPlatformFolders: true,
        createRpmPackage: true,
        targetAllPlatforms: true,
        skipFips,
        targetFipsPlatforms,
      });

      expect(
        jest.mocked(runFpm).mock.calls.map(([, , , , platform]) => platform.toString())
      ).toEqual(expected);
      expect(Tasks.BundleFipsProvider.run).toHaveBeenCalledTimes(1);
    }
  );
});
