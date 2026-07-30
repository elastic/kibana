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

describe('CreateCdnAssets', () => {
  beforeEach(() => {
    mockedCopyAll.mockClear();
    mockedCopyAll.mockResolvedValue(undefined);
  });

  it('copies unified bundles from target/public/bundles', async () => {
    await CreateCdnAssets.run(config, log, mockedBuild);

    expect(mockedCopyAll).toHaveBeenCalledWith(
      resolve(buildSource, 'target/public/bundles'),
      expect.stringMatching(/[/\\]bundles$/)
    );
  });
});
