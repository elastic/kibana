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
  createAbsolutePathSerializer,
} from '@kbn/dev-utils';

import { Config } from '../../lib';
import { ExtractNodeBuilds } from './extract_node_builds_task';

jest.mock('../../lib/fs');

const Fs = jest.requireMock('../../lib/fs');

const log = new ToolingLog();
const testWriter = new ToolingLogCollectingWriter();
log.setWriters([testWriter]);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

async function setup() {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
  });

  return { config };
}

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
});

it('runs expected fs operations', async () => {
  const { config } = await setup();

  await ExtractNodeBuilds.run(config, log, []);

  const usedMethods = Object.fromEntries(
    Object.entries(Fs)
      .filter((entry): entry is [string, jest.Mock] => {
        const [, mock] = entry;

        if (typeof mock !== 'function') {
          return false;
        }

        return (mock as jest.Mock).mock.calls.length > 0;
      })
      .map(([name, mock]) => [name, mock.mock.calls])
  );

  expect(usedMethods).toMatchInlineSnapshot(`
    Object {
      "copy": Array [
        Array [
          <absolute path>/.node_binaries/10.21.0/node.exe,
          <absolute path>/.node_binaries/10.21.0/win32-x64/node.exe,
          Object {
            "clone": true,
          },
        ],
      ],
      "untar": Array [
        Array [
          <absolute path>/.node_binaries/10.21.0/node-v10.21.0-linux-x64.tar.gz,
          <absolute path>/.node_binaries/10.21.0/linux-x64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/10.21.0/node-v10.21.0-linux-arm64.tar.gz,
          <absolute path>/.node_binaries/10.21.0/linux-arm64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/10.21.0/node-v10.21.0-darwin-x64.tar.gz,
          <absolute path>/.node_binaries/10.21.0/darwin-x64,
          Object {
            "strip": 1,
          },
        ],
      ],
    }
  `);
});
