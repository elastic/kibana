/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '#pipeline-utils';
import { BuildkiteClient } from '#pipeline-utils';
import {
  CANCELLED_BUILDS_TIP_CONTEXT,
  countRecentCancelledBuilds,
  getCancelledBuildsTipMessage,
  postCancelledBuildsTip,
} from './cancelled_builds_tip.ts';

const mockGetFinishedBuildsForBranch = jest.fn();
const mockUpsertComment = jest.fn();

jest.mock('#pipeline-utils', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    getFinishedBuildsForBranch: mockGetFinishedBuildsForBranch,
  })),
  upsertComment: (...args: unknown[]) => mockUpsertComment(...args),
}));

const PR = '1234';
const NOW = Date.UTC(2026, 10, 6, 12, 0);
const minutesAgo = (value: number) => new Date(NOW - value * 60 * 1000).toISOString();

const build = ({
  createdMinutesAgo = 60,
  ranMinutes = 20,
  state = 'canceled',
  message = 'Address review comments',
  prNumber = PR,
  draft = false,
}: {
  createdMinutesAgo?: number;
  ranMinutes?: number;
  state?: string;
  message?: string;
  prNumber?: string;
  draft?: boolean;
} = {}): Build =>
  ({
    state,
    message,
    env: { GITHUB_PR_DRAFT: String(draft) },
    meta_data: {},
    created_at: minutesAgo(createdMinutesAgo),
    started_at: minutesAgo(createdMinutesAgo),
    finished_at: minutesAgo(createdMinutesAgo - ranMinutes),
    pull_request: { id: prNumber, base: 'main', repository: 'elastic/kibana' },
  } as unknown as Build);

describe('countRecentCancelledBuilds', () => {
  it('counts builds cancelled in the last day after running for a while', () => {
    const builds = [
      build({ createdMinutesAgo: 120 }),
      build({ createdMinutesAgo: 60 }),
      build({ state: 'passed' }),
    ];

    expect(countRecentCancelledBuilds(builds, PR, NOW)).toBe(2);
  });

  it('ignores builds older than a day', () => {
    expect(countRecentCancelledBuilds([build({ createdMinutesAgo: 25 * 60 })], PR, NOW)).toBe(0);
  });

  it('ignores builds cancelled within their first 10 minutes', () => {
    expect(countRecentCancelledBuilds([build({ ranMinutes: 9 })], PR, NOW)).toBe(0);
  });

  it('ignores builds that ran while the PR was a draft', () => {
    const fromMetaData = { ...build(), env: {}, meta_data: { 'ingest:is_draft_pr': 'true' } };

    expect(
      countRecentCancelledBuilds([build({ draft: true }), fromMetaData as Build], PR, NOW)
    ).toBe(0);
  });

  it('ignores builds of bot fix commits', () => {
    expect(
      countRecentCancelledBuilds(
        [build({ message: 'Changes from node scripts/eslint --fix' })],
        PR,
        NOW
      )
    ).toBe(0);
  });

  it('ignores builds of other PRs on the same branch name', () => {
    expect(countRecentCancelledBuilds([build({ prNumber: '999' })], PR, NOW)).toBe(0);
  });
});

describe('postCancelledBuildsTip', () => {
  const ORIGINAL_ENV = process.env;
  const cancelledBuilds = [
    build({ createdMinutesAgo: 180 }),
    build({ createdMinutesAgo: 120 }),
    build({ createdMinutesAgo: 60 }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    process.env = {
      ...ORIGINAL_ENV,
      BUILDKITE_PIPELINE_SLUG: 'kibana-pull-request',
      BUILDKITE_BRANCH: 'jane:feature',
      GITHUB_PR_NUMBER: PR,
      GITHUB_PR_USER: 'jane',
      GITHUB_PR_DRAFT: 'false',
    };
    mockGetFinishedBuildsForBranch.mockResolvedValue(cancelledBuilds);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('posts the tip once three builds were cancelled in the last day', async () => {
    await postCancelledBuildsTip();

    expect(BuildkiteClient).toHaveBeenCalledWith({ timeoutMs: 15_000 });
    expect(mockGetFinishedBuildsForBranch).toHaveBeenCalledWith(
      'kibana-pull-request',
      'jane:feature',
      100,
      { excludeJobs: true }
    );
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
