/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import { runBuild } from '@kbn/rspack-optimizer';

import { BuildRspackBundles } from './build_rspack_bundles_task';
import { Build, write } from '../lib';
import { getMockConfig } from '../lib/__mocks__/get_config';

jest.mock('@kbn/rspack-optimizer', () => ({
  runBuild: jest.fn(),
}));

jest.mock('globby', () => jest.fn());

const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
const mockRm = jest.fn();

jest.mock('fs/promises', () => ({
  __esModule: true,
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
    rm: (...args: unknown[]) => mockRm(...args),
  },
}));

jest.mock('../lib', () => {
  const actual = jest.requireActual('../lib');
  return {
    ...actual,
    write: jest.fn().mockResolvedValue(undefined),
  };
});

const mockedRunBuild = runBuild as jest.MockedFunction<typeof runBuild>;
const mockedGlobby = jest.requireMock('globby') as jest.MockedFunction<typeof import('globby')>;
const mockedWrite = write as jest.MockedFunction<typeof write>;

describe('BuildRspackBundles', () => {
  const log = new ToolingLog();
  const config = getMockConfig();
  const build = new Build(config);

  let tmpDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'rspack-bundles-task-test-'));
    jest
      .spyOn(build, 'resolvePath')
      .mockImplementation((...segments: string[]) => Path.resolve(tmpDir, ...segments));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try {
      Fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // tmpDir may be undefined if beforeEach failed
    }
  });

  const metricsPath = () => Path.resolve(tmpDir, 'target/public/bundles/metrics.json');
  const entryWrappersPath = () => Path.resolve(tmpDir, 'target/.rspack-entry-wrappers');

  it('calls runBuild with dist, no cache, no watch, and no hmr', async () => {
    mockedRunBuild.mockResolvedValue({ success: true });
    mockedGlobby.mockResolvedValue([]);
    mockReadFile.mockResolvedValueOnce('{}');

    await BuildRspackBundles.run(config, log, build);

    expect(mockedRunBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        dist: true,
        cache: false,
        watch: false,
        hmr: false,
        examples: config.pluginSelector.examples,
        testPlugins: config.pluginSelector.testPlugins,
        log,
      })
    );
  });

  it('throws an error including rspack messages when the build fails', async () => {
    mockedRunBuild.mockResolvedValue({
      success: false,
      errors: ['module not found', 'syntax error'],
    });

    await expect(BuildRspackBundles.run(config, log, build)).rejects.toThrow(
      'RSPack build failed: module not found, syntax error'
    );
    expect(mockedGlobby).not.toHaveBeenCalled();
  });

  it('brotli-compresses each .js bundle and writes a .br sidecar', async () => {
    const jsFile = Path.join(tmpDir, 'target/public/bundles', 'chunk.js');
    mockedRunBuild.mockResolvedValue({ success: true });
    mockedGlobby.mockResolvedValue([jsFile]);
    mockReadFile.mockImplementation(async (filePath: string | URL) => {
      const p = String(filePath);
      if (p.endsWith('metrics.json')) {
        return '{}';
      }
      return Buffer.from('bundle-bytes');
    });

    await BuildRspackBundles.run(config, log, build);

    expect(mockedGlobby).toHaveBeenCalledWith(['**/*.js'], {
      cwd: Path.resolve(tmpDir, 'target/public/bundles'),
      absolute: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(`${jsFile}.br`, expect.any(Buffer));
  });

  it('reads metrics.json and writes optimizer_bundle_metrics.json under the target dir', async () => {
    const metricsPayload = { plugins: { a: 1 } };
    mockedRunBuild.mockResolvedValue({ success: true });
    mockedGlobby.mockResolvedValue([]);
    mockReadFile.mockResolvedValueOnce(JSON.stringify(metricsPayload));

    await BuildRspackBundles.run(config, log, build);

    expect(mockReadFile).toHaveBeenCalledWith(metricsPath(), 'utf-8');
    expect(mockedWrite).toHaveBeenCalledWith(
      config.resolveFromTarget('optimizer_bundle_metrics.json'),
      JSON.stringify(metricsPayload, null, 2)
    );
  });

  it('removes metrics.json and the rspack entry wrappers directory', async () => {
    mockedRunBuild.mockResolvedValue({ success: true });
    mockedGlobby.mockResolvedValue([]);
    mockReadFile.mockResolvedValueOnce('{}');

    await BuildRspackBundles.run(config, log, build);

    expect(mockUnlink).toHaveBeenCalledWith(metricsPath());
    expect(mockRm).toHaveBeenCalledWith(entryWrappersPath(), {
      recursive: true,
      force: true,
    });
  });
});
