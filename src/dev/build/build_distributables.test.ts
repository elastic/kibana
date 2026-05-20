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
  const noopTaskRun = jest.fn().mockResolvedValue(undefined);
  const mockRspackBundleTaskRun = jest.fn().mockResolvedValue(undefined);
  const mockLegacyBundleTaskRun = jest.fn().mockResolvedValue(undefined);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(actual)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'run' in value &&
      typeof (value as { run: unknown }).run === 'function'
    ) {
      if (key === 'BuildRspackBundles') {
        result[key] = { ...(value as object), run: mockRspackBundleTaskRun };
      } else if (key === 'BuildKibanaPlatformPlugins') {
        result[key] = { ...(value as object), run: mockLegacyBundleTaskRun };
      } else {
        result[key] = { ...(value as object), run: noopTaskRun };
      }
    } else {
      result[key] = value;
    }
  }

  return result;
});

const mockRspackBundleTaskRun = Tasks.BuildRspackBundles.run as jest.MockedFunction<
  typeof Tasks.BuildRspackBundles.run
>;
const mockLegacyBundleTaskRun = Tasks.BuildKibanaPlatformPlugins.run as jest.MockedFunction<
  typeof Tasks.BuildKibanaPlatformPlugins.run
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

let originalKbnUseRspack: string | undefined;

describe('buildDistributables KBN_USE_RSPACK gate', () => {
  beforeAll(() => {
    originalKbnUseRspack = process.env.KBN_USE_RSPACK;
  });

  beforeEach(() => {
    mockRspackBundleTaskRun.mockClear();
    mockLegacyBundleTaskRun.mockClear();
  });

  afterEach(() => {
    if (originalKbnUseRspack === undefined) {
      delete process.env.KBN_USE_RSPACK;
    } else {
      process.env.KBN_USE_RSPACK = originalKbnUseRspack;
    }
  });

  it('runs BuildRspackBundles when KBN_USE_RSPACK is "true"', async () => {
    process.env.KBN_USE_RSPACK = 'true';

    await buildDistributables(log, minimalGenericFoldersOptions);

    expect(mockRspackBundleTaskRun).toHaveBeenCalledTimes(1);
    expect(mockLegacyBundleTaskRun).not.toHaveBeenCalled();
    expect(Tasks.BuildRspackBundles.run).toHaveBeenCalledTimes(1);
  });

  it('runs BuildKibanaPlatformPlugins when KBN_USE_RSPACK is not set', async () => {
    delete process.env.KBN_USE_RSPACK;

    await buildDistributables(log, minimalGenericFoldersOptions);

    expect(mockLegacyBundleTaskRun).toHaveBeenCalledTimes(1);
    expect(mockRspackBundleTaskRun).not.toHaveBeenCalled();
    expect(Tasks.BuildKibanaPlatformPlugins.run).toHaveBeenCalledTimes(1);
  });

  it('runs BuildRspackBundles when KBN_USE_RSPACK is "1"', async () => {
    process.env.KBN_USE_RSPACK = '1';

    await buildDistributables(log, minimalGenericFoldersOptions);

    expect(mockRspackBundleTaskRun).toHaveBeenCalledTimes(1);
    expect(mockLegacyBundleTaskRun).not.toHaveBeenCalled();
  });
});
