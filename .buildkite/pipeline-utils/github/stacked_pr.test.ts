/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockGraphql = jest.fn();

jest.mock('./github', () => ({
  getGithubClient: () => ({ graphql: mockGraphql }),
}));

import { getEffectiveTargetBranch } from './stacked_pr';

describe('getEffectiveTargetBranch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the stack base for a PR stacked on a feature branch', async () => {
    mockGraphql.mockResolvedValue({
      repository: { pullRequest: { stack: { baseRefName: 'main' } } },
    });

    await expect(
      getEffectiveTargetBranch('elastic', 'kibana', 289662, 'tal/connector-auth-capabilities')
    ).resolves.toEqual('main');
  });

  it('passes the PR number to the API as an integer', async () => {
    mockGraphql.mockResolvedValue({
      repository: { pullRequest: { stack: { baseRefName: 'main' } } },
    });

    await getEffectiveTargetBranch('elastic', 'kibana', '289662', 'feature-branch');

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ owner: 'elastic', repo: 'kibana', number: 289662 })
    );
  });

  it('keeps the direct target branch when the PR is not stacked', async () => {
    mockGraphql.mockResolvedValue({ repository: { pullRequest: { stack: null } } });

    await expect(getEffectiveTargetBranch('elastic', 'kibana', 289661, 'main')).resolves.toEqual(
      'main'
    );
  });

  it('does not promote a stacked PR whose stack targets a release branch', async () => {
    mockGraphql.mockResolvedValue({
      repository: { pullRequest: { stack: { baseRefName: '9.4' } } },
    });

    await expect(
      getEffectiveTargetBranch('elastic', 'kibana', 12345, 'some/feature-branch')
    ).resolves.toEqual('9.4');
  });

  it('falls back to the direct target branch when the API call fails', async () => {
    mockGraphql.mockRejectedValue(new Error('Bad credentials'));

    await expect(
      getEffectiveTargetBranch('elastic', 'kibana', 289662, 'feature-branch')
    ).resolves.toEqual('feature-branch');
  });

  it('falls back when the response omits the stack field entirely', async () => {
    mockGraphql.mockResolvedValue({});

    await expect(
      getEffectiveTargetBranch('elastic', 'kibana', 289662, 'feature-branch')
    ).resolves.toEqual('feature-branch');
  });

  it('does not call the API when PR context is missing', async () => {
    await expect(getEffectiveTargetBranch(undefined, 'kibana', 289662, 'main')).resolves.toEqual(
      'main'
    );
    expect(mockGraphql).not.toHaveBeenCalled();
  });

  it('does not call the API when the PR number is not numeric', async () => {
    await expect(
      getEffectiveTargetBranch('elastic', 'kibana', 'not-a-number', 'main')
    ).resolves.toEqual('main');
    expect(mockGraphql).not.toHaveBeenCalled();
  });
});
