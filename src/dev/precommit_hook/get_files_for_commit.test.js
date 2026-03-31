/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockDiff = jest.fn();
const mockRaw = jest.fn();

jest.mock('simple-git', () =>
  jest.fn().mockImplementation(() => ({
    diff: mockDiff,
    raw: mockRaw,
  }))
);

import SimpleGit from 'simple-git';
import { getFilesForCommit } from './get_files_for_commit';

describe('dev/precommit_hook/get_files_for_commit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the first ref when duplicate --ref flags are parsed as an array', async () => {
    mockDiff.mockResolvedValue('M\tfoo.ts\n');

    const files = await getFilesForCommit(['bb97506c7071', 'HEAD']);

    expect(SimpleGit).toHaveBeenCalledTimes(1);
    expect(mockDiff).toHaveBeenCalledWith(['--name-status', 'bb97506c7071']);
    expect(files.map((file) => file.getRelativePath())).toEqual(['foo.ts']);
  });

  it('falls back to staged changes when no ref is provided', async () => {
    mockDiff.mockResolvedValue('M\tbar.ts\n');

    await getFilesForCommit();

    expect(mockDiff).toHaveBeenCalledWith(['--name-status', '--cached']);
  });
});
