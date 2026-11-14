/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { generateBuildNoticeText } from '../../notice';
import { Build, write } from '../lib';
import { getMockConfig } from '../lib/__mocks__/get_config';
import { CLOUD_PLATFORMS, SERVERLESS_PLATFORMS } from '../lib/platform';
import { CreateNoticeFile } from './notice_file_task';
import { getNodeDownloadInfo } from './nodejs';

jest.mock('../../npm', () => ({
  getInstalledPackages: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../license_checker', () => ({
  LICENSE_OVERRIDES: {},
}));

jest.mock('../../notice', () => ({
  generateNoticeFromSource: jest.fn().mockResolvedValue('source notice'),
  generateBuildNoticeText: jest.fn().mockResolvedValue('build notice'),
}));

jest.mock('../lib', () => ({
  ...jest.requireActual<typeof import('../lib')>('../lib'),
  write: jest.fn().mockResolvedValue(undefined),
}));

describe('CreateNoticeFile', () => {
  const config = getMockConfig();
  const log = new ToolingLog();
  const build = new Build(config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([...CLOUD_PLATFORMS, ...SERVERLESS_PLATFORMS])(
    'uses the downloaded %s Node build for the notice',
    async (platform) => {
      jest.spyOn(config, 'getNodePlatforms').mockReturnValue([platform]);

      await CreateNoticeFile.run(config, log, build);

      const [{ extractDir: nodeDir, version: nodeVersion }] = getNodeDownloadInfo(config, platform);
      expect(generateBuildNoticeText).toHaveBeenCalledWith({
        noticeFromSource: 'source notice',
        packages: [],
        nodeDir,
        nodeVersion,
      });
      expect(write).toHaveBeenCalledWith(build.resolvePath('NOTICE.txt'), 'build notice');
    }
  );

  it('uses a Linux Node build when the host download is not Linux', async () => {
    const linuxPlatform = config.getPlatform('linux', 'x64');
    jest
      .spyOn(config, 'getNodePlatforms')
      .mockReturnValue([config.getPlatform('win32', 'x64'), linuxPlatform]);

    await CreateNoticeFile.run(config, log, build);

    const [{ extractDir: nodeDir, version: nodeVersion }] = getNodeDownloadInfo(
      config,
      linuxPlatform
    );
    expect(generateBuildNoticeText).toHaveBeenCalledWith({
      noticeFromSource: 'source notice',
      packages: [],
      nodeDir,
      nodeVersion,
    });
  });

  it('fails explicitly when no Linux Node build is available', async () => {
    jest.spyOn(config, 'getNodePlatforms').mockReturnValue([config.getPlatform('win32', 'x64')]);

    await expect(CreateNoticeFile.run(config, log, build)).rejects.toThrow(
      'Unable to find a Linux Node.js build for the notice file'
    );
    expect(generateBuildNoticeText).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
