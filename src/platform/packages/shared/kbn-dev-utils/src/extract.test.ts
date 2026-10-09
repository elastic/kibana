/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import execa from 'execa';
import * as tar from 'tar';
import { extract } from './extract';

jest.mock('execa');
jest.mock('tar');

const mockExeca = execa as jest.MockedFunction<typeof execa>;
const mockTarExtract = tar.extract as jest.MockedFunction<typeof tar.extract>;

const options = {
  archivePath: '/archives/node.tar.gz',
  targetDir: '/extract/node',
  stripComponents: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Fs, 'mkdir').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('tar extraction', () => {
  it('uses native tar', async () => {
    await extract(options);

    expect(mockExeca).toHaveBeenCalledWith('tar', [
      '--extract',
      '--file',
      options.archivePath,
      '--directory',
      options.targetDir,
      '--strip-components=1',
    ]);
    expect(mockTarExtract).not.toHaveBeenCalled();
  });

  it('falls back to JavaScript extraction when native tar fails', async () => {
    mockExeca.mockRejectedValueOnce(new Error('tar is unavailable'));

    await extract(options);

    expect(mockTarExtract).toHaveBeenCalledWith({
      file: options.archivePath,
      cwd: options.targetDir,
      stripComponents: options.stripComponents,
    });
  });
});
