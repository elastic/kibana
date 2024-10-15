/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/utils';
import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAnyInstanceSerializer,
  createRecursiveSerializer,
} from '@kbn/dev-utils';

import { Config, Platform } from '../../lib';
import { VerifyExistingNodeBuilds } from './verify_existing_node_builds_task';

jest.mock('./node_shasums');
jest.mock('./node_download_info');
jest.mock('../../lib/fs');
jest.mock('../../lib/get_build_number');

const { getNodeShasums } = jest.requireMock('./node_shasums');
const { getNodeDownloadInfo } = jest.requireMock('./node_download_info');
const { getFileHash } = jest.requireMock('../../lib/fs');

const log = new ToolingLog();
const testWriter = new ToolingLogCollectingWriter();
log.setWriters([testWriter]);

expect.addSnapshotSerializer(createAnyInstanceSerializer(Config));
expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));

const nodeVersion = Fs.readFileSync(Path.resolve(REPO_ROOT, '.node-version'), 'utf8').trim();
expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (s) => typeof s === 'string' && s.includes(nodeVersion),
    (s) => s.split(nodeVersion).join('<node version>')
  )
);

async function setup(actualShaSums?: Record<string, string>) {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
    dockerContextUseLocalArtifact: false,
    dockerCrossCompile: false,
  });

  getNodeShasums.mockReturnValue(
    Object.fromEntries(
      config.getTargetPlatforms().map((platform) => {
        return [`${platform.getName()}:${platform.getNodeArch()}:downloadName`, 'valid shasum'];
      })
    )
  );

  getNodeDownloadInfo.mockImplementation((_: Config, platform: Platform) => {
    return {
      downloadPath: `${platform.getName()}:${platform.getNodeArch()}:downloadPath`,
      downloadName: `${platform.getName()}:${platform.getNodeArch()}:downloadName`,
    };
  });

  getFileHash.mockImplementation((downloadPath: string) => {
    if (actualShaSums?.[downloadPath]) {
      return actualShaSums[downloadPath];
    }

    return 'valid shasum';
  });

  return { config };
}

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
});

it('checks shasums for each downloaded node build', async () => {
  const { config } = await setup();

  await VerifyExistingNodeBuilds.run(config, log, []);

  expect(getNodeShasums).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          <ToolingLog>,
          "<node version>",
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": Object {
            "darwin:darwin-arm64:downloadName": "valid shasum",
            "darwin:darwin-x64:downloadName": "valid shasum",
            "linux:linux-arm64:downloadName": "valid shasum",
            "linux:linux-x64:downloadName": "valid shasum",
            "win32:win32-x64:downloadName": "valid shasum",
          },
        },
      ],
    }
  `);
  expect(getNodeDownloadInfo).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          <Config>,
          Platform {
            "architecture": "x64",
            "buildName": "linux-x86_64",
            "name": "linux",
          },
        ],
        Array [
          <Config>,
          Platform {
            "architecture": "arm64",
            "buildName": "linux-aarch64",
            "name": "linux",
          },
        ],
        Array [
          <Config>,
          Platform {
            "architecture": "x64",
            "buildName": "darwin-x86_64",
            "name": "darwin",
          },
        ],
        Array [
          <Config>,
          Platform {
            "architecture": "arm64",
            "buildName": "darwin-aarch64",
            "name": "darwin",
          },
        ],
        Array [
          <Config>,
          Platform {
            "architecture": "x64",
            "buildName": "windows-x86_64",
            "name": "win32",
          },
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": Object {
            "downloadName": "linux:linux-x64:downloadName",
            "downloadPath": "linux:linux-x64:downloadPath",
          },
        },
        Object {
          "type": "return",
          "value": Object {
            "downloadName": "linux:linux-arm64:downloadName",
            "downloadPath": "linux:linux-arm64:downloadPath",
          },
        },
        Object {
          "type": "return",
          "value": Object {
            "downloadName": "darwin:darwin-x64:downloadName",
            "downloadPath": "darwin:darwin-x64:downloadPath",
          },
        },
        Object {
          "type": "return",
          "value": Object {
            "downloadName": "darwin:darwin-arm64:downloadName",
            "downloadPath": "darwin:darwin-arm64:downloadPath",
          },
        },
        Object {
          "type": "return",
          "value": Object {
            "downloadName": "win32:win32-x64:downloadName",
            "downloadPath": "win32:win32-x64:downloadPath",
          },
        },
      ],
    }
  `);
  expect(getFileHash).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          "linux:linux-x64:downloadPath",
          "sha256",
        ],
        Array [
          "linux:linux-arm64:downloadPath",
          "sha256",
        ],
        Array [
          "darwin:darwin-x64:downloadPath",
          "sha256",
        ],
        Array [
          "darwin:darwin-arm64:downloadPath",
          "sha256",
        ],
        Array [
          "win32:win32-x64:downloadPath",
          "sha256",
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": "valid shasum",
        },
        Object {
          "type": "return",
          "value": "valid shasum",
        },
        Object {
          "type": "return",
          "value": "valid shasum",
        },
        Object {
          "type": "return",
          "value": "valid shasum",
        },
        Object {
          "type": "return",
          "value": "valid shasum",
        },
      ],
    }
  `);
});

it('rejects if any download has an incorrect sha256', async () => {
  const { config } = await setup({
    'linux:linux-arm64:downloadPath': 'invalid shasum',
  });

  await expect(
    VerifyExistingNodeBuilds.run(config, log, [])
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Download at linux:linux-arm64:downloadPath does not match expected checksum invalid shasum"`
  );
});
