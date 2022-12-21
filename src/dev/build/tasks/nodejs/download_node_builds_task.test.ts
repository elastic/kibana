/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { createAnyInstanceSerializer } from '@kbn/jest-serializers';

import { Config, Platform } from '../../lib';
import { DownloadNodeBuilds } from './download_node_builds_task';

jest.mock('./node_shasums');
jest.mock('./node_download_info');
jest.mock('../../lib/download');
jest.mock('../../lib/get_build_number');

expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));

const { getNodeDownloadInfo } = jest.requireMock('./node_download_info');
const { getNodeShasums } = jest.requireMock('./node_shasums');
const { downloadToDisk } = jest.requireMock('../../lib/download');

const log = new ToolingLog();
const testWriter = new ToolingLogCollectingWriter();
log.setWriters([testWriter]);

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
});

async function setup({ failOnUrl }: { failOnUrl?: string } = {}) {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
    dockerContextUseLocalArtifact: false,
    dockerCrossCompile: false,
    dockerPush: false,
    dockerTagQualifier: '',
  });

  getNodeDownloadInfo.mockImplementation((_: Config, platform: Platform) => {
    return {
      url: `${platform.getName()}:url`,
      downloadPath: `${platform.getName()}:downloadPath`,
      downloadName: `${platform.getName()}:downloadName`,
    };
  });

  getNodeShasums.mockReturnValue({
    'linux:downloadName': 'linux:sha256',
    'darwin:downloadName': 'darwin:sha256',
    'win32:downloadName': 'win32:sha256',
  });

  downloadToDisk.mockImplementation(({ url }: any) => {
    if (url === failOnUrl) {
      throw new Error('Download failed for reasons');
    }
  });

  return { config };
}

it('downloads node builds for each platform', async () => {
  const { config } = await setup();

  await DownloadNodeBuilds.run(config, log, []);

  expect(downloadToDisk.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "destination": "linux:downloadPath",
          "log": <ToolingLog>,
          "maxAttempts": 3,
          "shaAlgorithm": "sha256",
          "shaChecksum": "linux:sha256",
          "url": "linux:url",
        },
      ],
      Array [
        Object {
          "destination": "linux:downloadPath",
          "log": <ToolingLog>,
          "maxAttempts": 3,
          "shaAlgorithm": "sha256",
          "shaChecksum": "linux:sha256",
          "url": "linux:url",
        },
      ],
      Array [
        Object {
          "destination": "darwin:downloadPath",
          "log": <ToolingLog>,
          "maxAttempts": 3,
          "shaAlgorithm": "sha256",
          "shaChecksum": "darwin:sha256",
          "url": "darwin:url",
        },
      ],
      Array [
        Object {
          "destination": "darwin:downloadPath",
          "log": <ToolingLog>,
          "maxAttempts": 3,
          "shaAlgorithm": "sha256",
          "shaChecksum": "darwin:sha256",
          "url": "darwin:url",
        },
      ],
      Array [
        Object {
          "destination": "win32:downloadPath",
          "log": <ToolingLog>,
          "maxAttempts": 3,
          "shaAlgorithm": "sha256",
          "shaChecksum": "win32:sha256",
          "url": "win32:url",
        },
      ],
    ]
  `);
  expect(testWriter.messages).toMatchInlineSnapshot(`Array []`);
});

it('rejects if any download fails', async () => {
  const { config } = await setup({ failOnUrl: 'linux:url' });

  await expect(DownloadNodeBuilds.run(config, log, [])).rejects.toMatchInlineSnapshot(
    `[Error: Download failed for reasons]`
  );
  expect(testWriter.messages).toMatchInlineSnapshot(`Array []`);
});
