/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { getRemoteDefaultBranchRefs } from './get_remote_default_branch_refs';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

const mockExeca = execa as unknown as jest.Mock;

describe('getRemoteDefaultBranchRefs', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('resolves and deduplicates remote default branch refs', async () => {
    mockExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'for-each-ref') {
        return {
          stdout:
            'refs/remotes/origin/HEAD\nrefs/remotes/upstream/HEAD\nrefs/remotes/origin/HEAD\n',
        };
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/origin/HEAD') {
        return { stdout: 'origin/main\n' };
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/upstream/HEAD') {
        return { stdout: 'upstream/main\n' };
      }

      throw new Error(`Unexpected command args: ${args.join(' ')}`);
    });

    await expect(getRemoteDefaultBranchRefs()).resolves.toEqual(['origin/main', 'upstream/main']);
  });

  it('ignores remotes that cannot be resolved', async () => {
    mockExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'for-each-ref') {
        return {
          stdout: 'refs/remotes/origin/HEAD\nrefs/remotes/broken/HEAD\nrefs/remotes/empty/HEAD\n',
        };
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/origin/HEAD') {
        return { stdout: 'origin/main\n' };
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/broken/HEAD') {
        throw new Error('broken remote');
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/empty/HEAD') {
        return { stdout: '   \n' };
      }

      throw new Error(`Unexpected command args: ${args.join(' ')}`);
    });

    await expect(getRemoteDefaultBranchRefs()).resolves.toEqual(['origin/main']);
  });

  it('resolves default branches for remotes with nested names', async () => {
    mockExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'for-each-ref') {
        return {
          stdout:
            'refs/remotes/origin/HEAD\nrefs/remotes/foo/bar/HEAD\nrefs/remotes/foo/bar/main\n',
        };
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/origin/HEAD') {
        return { stdout: 'origin/main\n' };
      }

      if (args[0] === 'symbolic-ref' && args[2] === 'refs/remotes/foo/bar/HEAD') {
        return { stdout: 'foo/bar/main\n' };
      }

      throw new Error(`Unexpected command args: ${args.join(' ')}`);
    });

    await expect(getRemoteDefaultBranchRefs()).resolves.toEqual(['origin/main', 'foo/bar/main']);
  });
});
