/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { resolveNearestMergeBase } from './resolve_nearest_merge_base';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

const mockExeca = execa as unknown as jest.Mock;

describe('resolveNearestMergeBase', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('returns the merge-base candidate with the smallest ahead count', async () => {
    mockExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'merge-base' && args[1] === 'HEAD' && args[2] === 'origin/main') {
        return { stdout: 'base-origin\n' };
      }

      if (args[0] === 'merge-base' && args[1] === 'HEAD' && args[2] === 'upstream/main') {
        return { stdout: 'base-upstream\n' };
      }

      if (args[0] === 'rev-list' && args[2] === 'base-origin..HEAD') {
        return { stdout: '12\n' };
      }

      if (args[0] === 'rev-list' && args[2] === 'base-upstream..HEAD') {
        return { stdout: '4\n' };
      }

      throw new Error(`Unexpected command args: ${args.join(' ')}`);
    });

    await expect(
      resolveNearestMergeBase({ baseRefs: ['origin/main', 'upstream/main'] })
    ).resolves.toEqual({
      baseRef: 'upstream/main',
      mergeBase: 'base-upstream',
      aheadCount: 4,
    });
  });

  it('returns undefined when no merge-base can be resolved', async () => {
    mockExeca.mockRejectedValue(new Error('git failed'));

    await expect(resolveNearestMergeBase({ baseRefs: ['origin/main'] })).resolves.toBeUndefined();
  });
});
