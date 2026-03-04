/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { countCommitsBetweenRefs } from './count_commits_between_refs';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

const mockExeca = execa as unknown as jest.Mock;

describe('countCommitsBetweenRefs', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('parses commit count from git rev-list output', async () => {
    mockExeca.mockResolvedValue({ stdout: '7\n' });

    await expect(
      countCommitsBetweenRefs({
        base: 'base-sha',
        head: 'head-sha',
      })
    ).resolves.toBe(7);
    expect(mockExeca).toHaveBeenCalledWith(
      'git',
      ['rev-list', '--count', 'base-sha..head-sha'],
      expect.objectContaining({ stdin: 'ignore' })
    );
  });

  it('throws when git output is not numeric', async () => {
    mockExeca.mockResolvedValue({ stdout: 'not-a-number\n' });

    await expect(
      countCommitsBetweenRefs({
        base: 'base-sha',
        head: 'head-sha',
      })
    ).rejects.toThrow("git rev-list returned a non-numeric commit count: 'not-a-number'");
  });
});
