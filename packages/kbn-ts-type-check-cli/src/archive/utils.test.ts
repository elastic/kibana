/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import * as Utils from './utils';

type ArchiveMetadata = Utils.ArchiveMetadata;
type PullRequestArchiveMetadata = Utils.PullRequestArchiveMetadata;
type LocateDeps = Parameters<typeof Utils.locateRemoteArchive>[3];

const createStubLog = (): SomeDevLog => {
  const stub = {
    info: jest.fn(),
    success: jest.fn(),
    verbose: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as SomeDevLog;

  return stub;
};

const createWithAuthMock = () => {
  const impl: typeof Utils.withGcsAuth = async <TReturn>(
    _log: SomeDevLog,
    action: () => Promise<TReturn>
  ) => action();

  return jest.fn(impl) as jest.MockedFunction<typeof Utils.withGcsAuth>;
};

describe('getPullRequestNumber', () => {
  const originalEnv = process.env.BUILDKITE_PULL_REQUEST;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BUILDKITE_PULL_REQUEST;
    } else {
      process.env.BUILDKITE_PULL_REQUEST = originalEnv;
    }
  });

  it('returns undefined when not running for a pull request', () => {
    process.env.BUILDKITE_PULL_REQUEST = 'false';
    expect(Utils.getPullRequestNumber()).toBeUndefined();
  });

  it('returns the pull request number when provided', () => {
    process.env.BUILDKITE_PULL_REQUEST = '12345';
    expect(Utils.getPullRequestNumber()).toBe('12345');
  });
});

describe('mergePullRequestMetadata', () => {
  const makeMetadata = (commitSha: string): ArchiveMetadata => ({
    commitSha,
    createdAt: '2024-01-01T00:00:00.000Z',
    prNumber: '123',
  });

  it('adds new commits first and removes duplicates', () => {
    const existing: PullRequestArchiveMetadata = {
      prNumber: '123',
      updatedAt: '2024-01-01T00:00:00.000Z',
      commits: [makeMetadata('old-1'), makeMetadata('old-2')],
    };

    const merged = Utils.mergePullRequestMetadata('123', existing, makeMetadata('old-2'));

    expect(merged.commits.map((entry) => entry.commitSha)).toEqual(['old-2', 'old-1']);
  });

  it('limits the number of stored commits', () => {
    const existing: PullRequestArchiveMetadata = {
      prNumber: '123',
      updatedAt: '2024-01-01T00:00:00.000Z',
      commits: Array.from({ length: 12 }, (_, index) => makeMetadata(`old-${index}`)),
    };

    const merged = Utils.mergePullRequestMetadata('123', existing, makeMetadata('new-commit'));

    expect(merged.commits).toHaveLength(10);
    expect(merged.commits[0].commitSha).toBe('new-commit');
  });
});

describe('locateRemoteArchive', () => {
  const log = createStubLog();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createDeps = (overrides: Partial<NonNullable<LocateDeps>>) => {
    const withAuth = createWithAuthMock();

    return {
      remoteExists: jest.fn(async () => false),
      readCommitMetadata: jest.fn(async () => undefined),
      readPullRequestMetadata: jest.fn(async () => undefined),
      withAuth,
      ...overrides,
    } as NonNullable<LocateDeps> & {
      withAuth: jest.MockedFunction<typeof Utils.withGcsAuth>;
    };
  };

  it('prefers pull request metadata candidates when available', async () => {
    const prArchiveUri = Utils.buildPullRequestRemoteUris('123').archiveUri;

    const deps = createDeps({
      remoteExists: jest.fn(async (uri: string) => uri === prArchiveUri),
      readCommitMetadata: jest.fn(async () => ({
        commitSha: 'pr-sha',
        createdAt: '2024-01-01T00:00:00.000Z',
        prNumber: '123',
      })),
      readPullRequestMetadata: jest.fn(async () => ({
        prNumber: '123',
        updatedAt: '2024-01-01T00:00:00.000Z',
        commits: [
          {
            commitSha: 'pr-sha',
            createdAt: '2024-01-01T00:00:00.000Z',
            prNumber: '123',
          },
        ],
      })),
    });

    const result = await Utils.locateRemoteArchive(log, ['history-sha'], { prNumber: '123' }, deps);

    expect(result).toEqual({
      kind: 'remote',
      remotePath: prArchiveUri,
      sha: 'pr-sha',
      source: 'pull-request',
      metadata: {
        commitSha: 'pr-sha',
        createdAt: '2024-01-01T00:00:00.000Z',
        prNumber: '123',
      },
    });

    expect(deps.remoteExists).toHaveBeenCalledTimes(1);
    expect(deps.remoteExists).toHaveBeenCalledWith(prArchiveUri);
    expect(deps.withAuth).toHaveBeenCalledTimes(1);
  });

  it('falls back to commit history when pull request metadata is not available', async () => {
    const prArchiveUri = Utils.buildPullRequestRemoteUris('123').archiveUri;

    const deps = createDeps({
      remoteExists: jest.fn(async (uri: string) => {
        if (uri === prArchiveUri) {
          return false;
        }

        return uri.includes('history-sha');
      }),
      readCommitMetadata: jest.fn(async () => ({
        commitSha: 'history-sha',
        createdAt: '2024-01-01T00:00:00.000Z',
      })),
      readPullRequestMetadata: jest.fn(async () => ({
        prNumber: '123',
        updatedAt: '2024-01-01T00:00:00.000Z',
        commits: [
          {
            commitSha: 'history-sha',
            createdAt: '2024-01-01T00:00:00.000Z',
            prNumber: '123',
          },
        ],
      })),
    });

    const result = await Utils.locateRemoteArchive(
      log,
      ['history-sha', 'older-sha'],
      { prNumber: '123' },
      deps
    );

    expect(result).toEqual({
      kind: 'remote',
      remotePath: Utils.buildCommitRemoteUris('history-sha').archiveUri,
      sha: 'history-sha',
      source: 'pull-request',
      metadata: {
        commitSha: 'history-sha',
        createdAt: '2024-01-01T00:00:00.000Z',
        prNumber: '123',
      },
    });

    expect(deps.remoteExists).toHaveBeenCalledTimes(2);
    expect(deps.remoteExists).toHaveBeenNthCalledWith(1, prArchiveUri);
    expect(deps.remoteExists).toHaveBeenNthCalledWith(
      2,
      Utils.buildCommitRemoteUris('history-sha').archiveUri
    );
    expect(deps.withAuth).toHaveBeenCalledTimes(1);
  });
});
