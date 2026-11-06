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
const mockGetBuild = jest.fn();
const mockUpsertComment = jest.fn();

jest.mock('#pipeline-utils', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    getFinishedBuildsForBranch: mockGetFinishedBuildsForBranch,
    getCurrentBuild: mockGetCurrentBuild,
    getBuild: mockGetBuild,
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
  jobs = [],
}: {
  commit: string;
  createdAt: number;
  finishedAt?: number;
  state?: string;
  message?: string;
  authorName?: string;
  prNumber?: string;
  jobs?: Array<{ state: string; finishedAt: number; softFailed?: boolean; retried?: boolean }>;
}): Build =>
  ({
    number: createdAt,
    commit,
    state,
    message,
    jobs: jobs.map(
      ({ state: jobState, finishedAt: jobFinishedAt, softFailed = false, retried = false }) => ({
        state: jobState,
        soft_failed: softFailed,
        retried,
        finished_at: minutes(jobFinishedAt),
      })
    ),
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

  it('ignores builds that had already failed before the newer push', () => {
    const builds = [
      build({
        commit: 'a',
        createdAt: 0,
        finishedAt: 20,
        jobs: [{ state: 'failed', finishedAt: 15 }],
      }),
      build({ commit: 'b', createdAt: 20, state: 'running' }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(0);
  });

  it('still counts builds whose only failures were soft-failed or retried', () => {
    const builds = [
      build({
        commit: 'a',
        createdAt: 0,
        finishedAt: 20,
        jobs: [
          { state: 'failed', finishedAt: 10, softFailed: true },
          { state: 'failed', finishedAt: 12, retried: true },
          { state: 'canceled', finishedAt: 20 },
        ],
      }),
      build({ commit: 'b', createdAt: 20, state: 'running' }),
    ];

    expect(countBuildsCancelledByPushes(builds, PR)).toBe(1);
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
    mockGetBuild.mockImplementation(async (_, buildNumber: number) =>
      cancelledBuilds.find(({ number }) => number === buildNumber)
    );
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

  it('lists builds without jobs and only fetches jobs for the superseded ones', async () => {
    await postCancelledBuildsTip();

    expect(mockGetFinishedBuildsForBranch).toHaveBeenCalledWith(
      'kibana-pull-request',
      'jane:feature',
      100,
      { excludeJobs: true }
    );
    expect(mockGetBuild.mock.calls.map(([, buildNumber]) => buildNumber)).toEqual([0, 15, 30]);
  });

  it('does not post below the threshold, without fetching any jobs', async () => {
    mockGetFinishedBuildsForBranch.mockResolvedValue(cancelledBuilds.slice(1));

    await postCancelledBuildsTip();

    expect(mockGetBuild).not.toHaveBeenCalled();
    expect(mockUpsertComment).not.toHaveBeenCalled();
  });

  it('does not post when a superseded build had already failed', async () => {
    mockGetBuild.mockImplementation(async (_, buildNumber: number) =>
      buildNumber === 15
        ? build({
            commit: 'b',
            createdAt: 15,
            finishedAt: 30,
            jobs: [{ state: 'failed', finishedAt: 25 }],
          })
        : cancelledBuilds.find(({ number }) => number === buildNumber)
    );

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
