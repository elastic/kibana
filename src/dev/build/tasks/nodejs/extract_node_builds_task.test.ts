/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

import { Config } from '../../lib';
import { ExtractNodeBuilds } from './extract_node_builds_task';

jest.mock('../../lib/fs');
jest.mock('../../lib/get_build_number');

const BuildFs = jest.requireMock('../../lib/fs');

const log = new ToolingLog();
const testWriter = new ToolingLogCollectingWriter();
log.setWriters([testWriter]);

const nodeVersion = Fs.readFileSync(Path.resolve(REPO_ROOT, '.node-version'), 'utf8').trim();

// The node variant may be overriden by an environment variable,
// to provide test coverage against pointer-compression
expect.addSnapshotSerializer({
  test: (value) =>
    typeof value === 'string' &&
    (value.includes(nodeVersion) ||
      Boolean(value.match(/(glibc-217|pointer-compression)/)) ||
      value.startsWith(REPO_ROOT)),
  print: (value) =>
    typeof value === 'string'
      ? value
          .replaceAll(nodeVersion, '<node version>')
          .replace('<node version>/glibc-217', '<node version>/<node variant>')
          .replace('<node version>/pointer-compression', '<node version>/<node variant>')
          .replace('<node version>/default', '<node version>/<node variant>')
          .replace(REPO_ROOT, '<absolute path>')
          .replace(/\\/g, '/')
      : '',
});

async function setup() {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
    targetServerlessPlatforms: false,
    dockerContextUseLocalArtifact: false,
    dockerCrossCompile: false,
    dockerNamespace: null,
    dockerPush: false,
    dockerTag: '',
    dockerTagQualifier: '',
    downloadFreshNode: true,
    withExamplePlugins: false,
    withTestPlugins: true,
  });

  return { config };
}

let originalGlibc217: string | undefined;
let originalPointerCompression: string | undefined;

beforeAll(() => {
  originalGlibc217 = process.env.CI_FORCE_NODE_GLIBC_217;
  originalPointerCompression = process.env.CI_FORCE_NODE_POINTER_COMPRESSION;
});

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
  // Extraction is skipped if folder already exists
  jest.spyOn(Fs, 'existsSync').mockImplementation(() => false);

  delete process.env.CI_FORCE_NODE_GLIBC_217;
  delete process.env.CI_FORCE_NODE_POINTER_COMPRESSION;
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  if (originalGlibc217 === undefined) {
    delete process.env.CI_FORCE_NODE_GLIBC_217;
  } else {
    process.env.CI_FORCE_NODE_GLIBC_217 = originalGlibc217;
  }

  if (originalPointerCompression === undefined) {
    delete process.env.CI_FORCE_NODE_POINTER_COMPRESSION;
  } else {
    process.env.CI_FORCE_NODE_POINTER_COMPRESSION = originalPointerCompression;
  }
});

async function runExtractNodeBuildsTask() {
  const { config } = await setup();

  await ExtractNodeBuilds.run(config, log);

  return Object.fromEntries(
    Object.entries(BuildFs)
      .filter((entry): entry is [string, jest.Mock] => {
        const [, mock] = entry;

        if (typeof mock !== 'function') {
          return false;
        }

        return (mock as jest.Mock).mock.calls.length > 0;
      })
      .map(([name, mock]) => [name, mock.mock.calls])
  );
}

describe('runs expected fs operations', () => {
  it('default variant', async () => {
    const usedMethods = await runExtractNodeBuildsTask();
    expect(usedMethods).toMatchSnapshot();
  });

  it('glibc-217 variant (CI_FORCE_NODE_GLIBC_217)', async () => {
    process.env.CI_FORCE_NODE_GLIBC_217 = 'true';
    const usedMethods = await runExtractNodeBuildsTask();
    expect(usedMethods).toMatchSnapshot();
  });

  it('pointer-compression variant (CI_FORCE_NODE_POINTER_COMPRESSION)', async () => {
    process.env.CI_FORCE_NODE_POINTER_COMPRESSION = 'true';
    const usedMethods = await runExtractNodeBuildsTask();
    expect(usedMethods).toMatchSnapshot();
  });
});
