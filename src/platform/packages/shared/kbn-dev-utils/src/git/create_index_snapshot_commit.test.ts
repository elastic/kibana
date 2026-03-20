/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { createIndexSnapshotCommit } from './create_index_snapshot_commit';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

const mockExeca = execa as unknown as jest.Mock;

describe('createIndexSnapshotCommit', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('creates a temporary commit from the current index', async () => {
    mockExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'write-tree') {
        return { stdout: 'tree-sha\n' };
      }

      if (args[0] === 'commit-tree') {
        return { stdout: 'commit-sha\n' };
      }

      throw new Error(`Unexpected command args: ${args.join(' ')}`);
    });

    await expect(createIndexSnapshotCommit()).resolves.toBe('commit-sha');
    expect(mockExeca).toHaveBeenNthCalledWith(
      2,
      'git',
      ['commit-tree', 'tree-sha', '-p', 'HEAD'],
      expect.objectContaining({ input: expect.any(String) })
    );
    expect(mockExeca.mock.calls[1][2].stdin).toBeUndefined();
  });
});
