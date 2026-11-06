/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '#pipeline-utils';
import {
  CANCELLED_BUILDS_TIP_CONTEXT,
  countBuildsCancelledByPushes,
  getCancelledBuildsTipMessage,
  postCancelledBuildsTip,
} from './cancelled_builds_tip.ts';

const mockGetFinishedBuildsForBranch = jest.fn();
const mockGetCurrentBuild = jest.fn();
const mockUpsertComment = jest.fn();

jest.mock('#pipeline-utils', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    getFinishedBuildsForBranch: mockGetFinishedBuildsForBranch,
    getCurrentBuild: mockGetCurrentBuild,
  })),
  upsertComment: (...args: unknown[]) => mockUpsertComment(...args),
}));

const PR = '1234';
const minutes = (value: number) => new Date(Date.UTC(2026, 10, 6, 9, value)).toISOString();

const build = ({
  commit,
  createdAt,
  finishedAt,
  state = 'canceled',
  message = 'Address review comments',
  authorName = 'Jane Doe',
  prNumber = PR,
}: {
  commit: string;
  createdAt: number;
  finishedAt?: number;
  state?: string;
  message?: string;
  authorName?: string;
  prNumber?: string;
}): Build =>
  ({
    commit,
    state,
    message,
    author: { name: authorName, email: `${authorName}@example.com` },
    created_at: minutes(createdAt),
    started_at: minutes(createdAt),
    finished_at: finishedAt === undefined ? null : minutes(finishedAt),
    pull_request: { id: prNumber, base: 'main', repository: 'elastic/kibana' },
  } as unknown as Build);

describe('countBuildsCancelledByPushes', () => {
  it('counts builds cancelled by a newer push after running for a while', () => {
    const builds = [
      build({ commit: 'a', createdAt: 0, finishedAt: 20 }),
      build({ commit: 'b', createdAt: 20, finishedAt: 45 }),
      build({ commit: 'c', createdAt: 45, state: 'running' }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(2);
  });

  it('ignores builds cancelled within their first 10 minutes', () => {
    const builds = [
      build({ commit: 'a', createdAt: 0, finishedAt: 4 }),
      build({ commit: 'b', createdAt: 4, state: 'running' }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(0);
  });

  it('ignores builds replaced by a kibanamachine fix commit', () => {
    const builds = [
      build({ commit: 'a', createdAt: 0, finishedAt: 20 }),
      build({
        commit: 'b',
        createdAt: 20,
        state: 'running',
        message: 'Changes from node scripts/eslint --fix',
        authorName: 'kibanamachine',
      }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(0);
  });

  it('ignores builds cancelled without a newer push, such as manual cancellations', () => {
    const builds = [
      build({ commit: 'a', createdAt: 0, finishedAt: 20 }),
      build({ commit: 'b', createdAt: 60, state: 'running' }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(0);
  });

  it('ignores builds of other PRs on the same branch name', () => {
    const builds = [
      build({ commit: 'a', createdAt: 0, finishedAt: 20, prNumber: '999' }),
      build({ commit: 'b', createdAt: 20, state: 'running', prNumber: '999' }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(0);
  });
});

describe('postCancelledBuildsTip', () => {
  const ORIGINAL_ENV = process.env;
  const cancelledBuilds = [
    build({ commit: 'a', createdAt: 0, finishedAt: 15 }),
    build({ commit: 'b', createdAt: 15, finishedAt: 30 }),
    build({ commit: 'c', createdAt: 30, finishedAt: 45 }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      BUILDKITE_PIPELINE_SLUG: 'kibana-pull-request',
      BUILDKITE_BRANCH: 'jane:feature',
      GITHUB_PR_NUMBER: PR,
      GITHUB_PR_USER: 'jane',
      GITHUB_PR_DRAFT: 'false',
    };
    mockGetFinishedBuildsForBranch.mockResolvedValue(cancelledBuilds);
    mockGetCurrentBuild.mockResolvedValue(build({ commit: 'd', createdAt: 45, state: 'running' }));
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('posts the tip once three builds were cancelled by pushes', async () => {
    await postCancelledBuildsTip();

    expect(mockUpsertComment).toHaveBeenCalledWith({
      commentBody: getCancelledBuildsTipMessage('jane', 3),
      commentContext: CANCELLED_BUILDS_TIP_CONTEXT,
      clearPrevious: false,
    });
  });

  it('does not post below the threshold', async () => {
    mockGetFinishedBuildsForBranch.mockResolvedValue(cancelledBuilds.slice(1));

    await postCancelledBuildsTip();

    expect(mockUpsertComment).not.toHaveBeenCalled();
  });

  it.each([
    ['a draft PR', { GITHUB_PR_DRAFT: 'true' }],
    ['a bot PR', { GITHUB_PR_USER: 'elastic-renovate-prod[bot]' }],
    ['another pipeline', { BUILDKITE_PIPELINE_SLUG: 'kibana-on-merge' }],
  ])('does nothing for %s', async (_, env) => {
    process.env = { ...process.env, ...env };

    await postCancelledBuildsTip();

    expect(mockGetFinishedBuildsForBranch).not.toHaveBeenCalled();
    expect(mockUpsertComment).not.toHaveBeenCalled();
  });

  it('never throws when the Buildkite API fails', async () => {
    mockGetFinishedBuildsForBranch.mockRejectedValue(new Error('boom'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(postCancelledBuildsTip()).resolves.toBeUndefined();
    expect(mockUpsertComment).not.toHaveBeenCalled();
  });
});
