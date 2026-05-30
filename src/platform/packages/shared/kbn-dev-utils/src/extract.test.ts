/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import Os from 'os';
import Path from 'path';

import execa from 'execa';
import * as tar from 'tar';

import { extract } from './extract';

jest.mock('execa');
jest.mock('tar', () => ({
  extract: jest.fn(),
}));

const mockExeca = execa as unknown as jest.Mock;
const mockTarExtract = tar.extract as unknown as jest.Mock;

describe('extract', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'kbn-dev-utils-extract-test-'));

    mockExeca.mockReset();
    mockExeca.mockResolvedValue({});

    mockTarExtract.mockReset();
    mockTarExtract.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await Fs.rm(targetDir, { recursive: true, force: true });
  });

  it('uses native tar for tar.gz archives', async () => {
    await extract({
      archivePath: '/tmp/elasticsearch.tar.gz',
      targetDir,
      stripComponents: 1,
    });

    expect(mockExeca).toHaveBeenNthCalledWith(1, 'tar', [
      '--use-compress-program=pigz',
      '-xf',
      '/tmp/elasticsearch.tar.gz',
      '-C',
      targetDir,
      '--strip-components=1',
    ]);
    expect(mockTarExtract).not.toHaveBeenCalled();
  });

  it('falls back to regular native tar when parallel gzip extraction fails', async () => {
    mockExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === '--use-compress-program=pigz') {
        throw new Error('unsupported option');
      }

      return {};
    });

    await extract({
      archivePath: '/tmp/elasticsearch.tar.gz',
      targetDir,
      stripComponents: 1,
    });

    expect(mockExeca).toHaveBeenLastCalledWith('tar', [
      '-xzf',
      '/tmp/elasticsearch.tar.gz',
      '-C',
      targetDir,
      '--strip-components=1',
    ]);
    expect(mockTarExtract).not.toHaveBeenCalled();
  });

  it('uses native tar for uncompressed tar archives', async () => {
    await extract({
      archivePath: '/tmp/elasticsearch.tar',
      targetDir,
      stripComponents: 0,
    });

    expect(mockExeca).toHaveBeenCalledWith('tar', [
      '-xf',
      '/tmp/elasticsearch.tar',
      '-C',
      targetDir,
      '--strip-components=0',
    ]);
    expect(mockTarExtract).not.toHaveBeenCalled();
  });

  it('falls back to node tar when native tar fails', async () => {
    mockExeca.mockRejectedValue(new Error('tar failed'));

    await extract({
      archivePath: '/tmp/elasticsearch.tar.gz',
      targetDir,
      stripComponents: 1,
    });

    expect(mockExeca).toHaveBeenCalledTimes(2);
    expect(mockTarExtract).toHaveBeenCalledWith({
      file: '/tmp/elasticsearch.tar.gz',
      cwd: targetDir,
      stripComponents: 1,
    });
  });
});
