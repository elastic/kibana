/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

import { ToolingLog } from '@kbn/tooling-log';

import { CreateCdnAssets } from './create_cdn_assets_task';
import { Build } from '../lib';
import { getMockConfig } from '../lib/__mocks__/get_config';
import { copyAll } from '../lib';

jest.mock('../lib');
jest.mock('globby');
jest.mock('del', () => jest.fn().mockResolvedValue(undefined));

jest.mock('@kbn/core-i18n-server-internal', () => ({
  getKibanaTranslationFiles: jest.fn().mockResolvedValue([]),
  discoverAllTranslationPaths: jest.fn().mockResolvedValue([]),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    init: jest.fn(),
    getTranslation: jest.fn().mockReturnValue({}),
  },
  i18nLoader: {
    registerTranslationFiles: jest.fn(),
    getTranslationsByLocale: jest.fn().mockResolvedValue({}),
  },
}));

const globby = jest.requireMock('globby') as { sync: jest.Mock };
globby.sync = jest.fn().mockReturnValue([]);

const mockedCopyAll = copyAll as jest.MockedFunction<typeof copyAll>;

const config = getMockConfig();
const log = new ToolingLog();
const buildSource = '/mock/build/root';
const mockedBuild = new Build(config);
(mockedBuild.resolvePath as jest.Mock).mockReturnValue(buildSource);

let originalKbnUseRspack: string | undefined;

describe('CreateCdnAssets KBN_USE_RSPACK gate', () => {
  beforeAll(() => {
    originalKbnUseRspack = process.env.KBN_USE_RSPACK;
  });

  beforeEach(() => {
    mockedCopyAll.mockClear();
    mockedCopyAll.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalKbnUseRspack === undefined) {
      delete process.env.KBN_USE_RSPACK;
    } else {
      process.env.KBN_USE_RSPACK = originalKbnUseRspack;
    }
  });

  it('copies unified rspack bundles from target/public/bundles when KBN_USE_RSPACK is "true"', async () => {
    process.env.KBN_USE_RSPACK = 'true';

    await CreateCdnAssets.run(config, log, mockedBuild);

    const expectedRspackSource = resolve(buildSource, 'target/public/bundles');
    expect(mockedCopyAll).toHaveBeenCalledWith(
      expectedRspackSource,
      expect.stringMatching(/[/\\]bundles$/)
    );
    expect(mockedCopyAll).not.toHaveBeenCalledWith(
      resolve(buildSource, 'node_modules/@kbn/core/target/public'),
      expect.anything()
    );
  });

  it('copies legacy core bundles from node_modules/@kbn/core/target/public when KBN_USE_RSPACK is not set', async () => {
    delete process.env.KBN_USE_RSPACK;

    await CreateCdnAssets.run(config, log, mockedBuild);

    const buildSha = config.getBuildShaShort();
    const expectedLegacySource = resolve(buildSource, 'node_modules/@kbn/core/target/public');
    const expectedLegacyDest = resolve(
      config.resolveFromRepo('build', 'cdn-assets'),
      buildSha,
      'bundles',
      'core'
    );

    expect(mockedCopyAll).toHaveBeenCalledWith(expectedLegacySource, expectedLegacyDest);
    expect(mockedCopyAll).not.toHaveBeenCalledWith(
      resolve(buildSource, 'target/public/bundles'),
      expect.anything()
    );
  });

  it('uses legacy core bundle path when KBN_USE_RSPACK is not exactly "true"', async () => {
    process.env.KBN_USE_RSPACK = 'false';

    await CreateCdnAssets.run(config, log, mockedBuild);

    expect(mockedCopyAll).toHaveBeenCalledWith(
      resolve(buildSource, 'node_modules/@kbn/core/target/public'),
      expect.stringMatching(/[/\\]core$/)
    );
  });
});
