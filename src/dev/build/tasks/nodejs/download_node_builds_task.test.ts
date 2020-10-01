/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAnyInstanceSerializer,
} from '@kbn/dev-utils';

import { Config, Platform } from '../../lib';
import { DownloadNodeBuilds } from './download_node_builds_task';

jest.mock('./node_shasums');
jest.mock('./node_download_info');
jest.mock('../../lib/download');
jest.mock('../../lib/get_build_number');

expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));

const { getNodeDownloadInfo } = jest.requireMock('./node_download_info');
const { getNodeShasums } = jest.requireMock('./node_shasums');
const { download } = jest.requireMock('../../lib/download');

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

  download.mockImplementation(({ url }: any) => {
    if (url === failOnUrl) {
      throw new Error('Download failed for reasons');
    }
  });

  return { config };
}

it('downloads node builds for each platform', async () => {
  const { config } = await setup();

  await DownloadNodeBuilds.run(config, log, []);

  expect(download.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "destination": "linux:downloadPath",
          "log": <ToolingLog>,
          "retries": 3,
          "sha256": "linux:sha256",
          "url": "linux:url",
        },
      ],
      Array [
        Object {
          "destination": "linux:downloadPath",
          "log": <ToolingLog>,
          "retries": 3,
          "sha256": "linux:sha256",
          "url": "linux:url",
        },
      ],
      Array [
        Object {
          "destination": "darwin:downloadPath",
          "log": <ToolingLog>,
          "retries": 3,
          "sha256": "darwin:sha256",
          "url": "darwin:url",
        },
      ],
      Array [
        Object {
          "destination": "win32:downloadPath",
          "log": <ToolingLog>,
          "retries": 3,
          "sha256": "win32:sha256",
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
