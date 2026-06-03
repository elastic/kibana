/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SnapshotCheckResult } from './resolve_snapshot_sha';
import { resolveSnapshotSha } from './resolve_snapshot_sha';

describe('resolveSnapshotSha', () => {
  const requestedSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const parentSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  const snapshotResultForSha =
    (sha: string) =>
    async (requested: string): Promise<SnapshotCheckResult> =>
      requested === sha ? { outcome: 'exists' } : { outcome: 'not_found' };

  it('returns the requested SHA when its snapshot exists on the first attempt', async () => {
    const snapshotExistsFn = jest
      .fn<Promise<SnapshotCheckResult>, [string]>()
      .mockImplementation(snapshotResultForSha(requestedSha));

    await expect(
      resolveSnapshotSha(requestedSha, {
        snapshotExistsFn,
        retryDelayMs: 0,
      })
    ).resolves.toEqual({
      requestedSha,
      resolvedSha: requestedSha,
      usedAncestorSnapshot: false,
    });

    expect(snapshotExistsFn).toHaveBeenCalledTimes(1);
  });

  it('retries the same SHA before walking to a parent commit', async () => {
    const snapshotExistsFn = jest
      .fn<Promise<SnapshotCheckResult>, [string]>()
      .mockImplementation(snapshotResultForSha(parentSha));

    const getParentCommitShaFn = jest.fn((sha: string) => {
      if (sha === requestedSha) {
        return parentSha;
      }
      throw new Error(`unexpected sha ${sha}`);
    });

    await expect(
      resolveSnapshotSha(requestedSha, {
        attemptsPerSha: 3,
        maxAncestorDepth: 3,
        retryDelayMs: 0,
        snapshotExistsFn,
        getParentCommitShaFn,
      })
    ).resolves.toEqual({
      requestedSha,
      resolvedSha: parentSha,
      usedAncestorSnapshot: true,
    });

    expect(snapshotExistsFn).toHaveBeenCalledTimes(4);
    expect(getParentCommitShaFn).toHaveBeenCalledTimes(1);
  });

  it('retries transient errors indefinitely without walking to a parent commit', async () => {
    let callCount = 0;
    const snapshotExistsFn = jest.fn(async (): Promise<SnapshotCheckResult> => {
      callCount++;
      if (callCount < 4) {
        return { outcome: 'transient_error' };
      }
      return { outcome: 'exists' };
    });
    const getParentCommitShaFn = jest.fn(() => parentSha);

    await expect(
      resolveSnapshotSha(requestedSha, {
        attemptsPerSha: 3,
        maxAncestorDepth: 3,
        retryDelayMs: 0,
        snapshotExistsFn,
        getParentCommitShaFn,
      })
    ).resolves.toEqual({
      requestedSha,
      resolvedSha: requestedSha,
      usedAncestorSnapshot: false,
    });

    expect(snapshotExistsFn).toHaveBeenCalledTimes(4);
    expect(getParentCommitShaFn).not.toHaveBeenCalled();
  });

  it('throws on terminal HTTP errors without walking to a parent commit', async () => {
    const snapshotExistsFn = jest.fn(
      async (): Promise<SnapshotCheckResult> => ({
        outcome: 'terminal_error',
        statusCode: 403,
      })
    );
    const getParentCommitShaFn = jest.fn(() => parentSha);

    await expect(
      resolveSnapshotSha(requestedSha, {
        attemptsPerSha: 3,
        maxAncestorDepth: 3,
        retryDelayMs: 0,
        snapshotExistsFn,
        getParentCommitShaFn,
      })
    ).rejects.toThrow(`Failed to check snapshot for '${requestedSha}': unexpected HTTP 403`);

    expect(snapshotExistsFn).toHaveBeenCalledTimes(1);
    expect(getParentCommitShaFn).not.toHaveBeenCalled();
  });

  it('does not count transient errors toward the not-found retry limit', async () => {
    const resultsByCall: SnapshotCheckResult[] = [
      { outcome: 'transient_error' },
      { outcome: 'not_found' },
      { outcome: 'transient_error' },
      { outcome: 'not_found' },
      { outcome: 'transient_error' },
      { outcome: 'not_found' },
      { outcome: 'exists' },
    ];
    let callCount = 0;
    const snapshotExistsFn = jest.fn(async (sha: string): Promise<SnapshotCheckResult> => {
      if (sha === parentSha) {
        return { outcome: 'exists' };
      }
      return resultsByCall[callCount++];
    });

    const getParentCommitShaFn = jest.fn((sha: string) => {
      if (sha === requestedSha) {
        return parentSha;
      }
      throw new Error(`unexpected sha ${sha}`);
    });

    await expect(
      resolveSnapshotSha(requestedSha, {
        attemptsPerSha: 3,
        maxAncestorDepth: 3,
        retryDelayMs: 0,
        snapshotExistsFn,
        getParentCommitShaFn,
      })
    ).resolves.toEqual({
      requestedSha,
      resolvedSha: parentSha,
      usedAncestorSnapshot: true,
    });

    expect(snapshotExistsFn).toHaveBeenCalledTimes(7);
    expect(getParentCommitShaFn).toHaveBeenCalledTimes(1);
  });

  it('attempts up to 4 SHAs with 3 tries each before failing', async () => {
    const snapshotExistsFn = jest.fn(
      async (): Promise<SnapshotCheckResult> => ({
        outcome: 'not_found',
      })
    );
    const getParentCommitShaFn = jest
      .fn<string, [string]>()
      .mockImplementationOnce(() => 'cccccccccccccccccccccccccccccccccccccccc')
      .mockImplementationOnce(() => 'dddddddddddddddddddddddddddddddddddddddd')
      .mockImplementationOnce(() => 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');

    await expect(
      resolveSnapshotSha(requestedSha, {
        attemptsPerSha: 3,
        maxAncestorDepth: 3,
        retryDelayMs: 0,
        snapshotExistsFn,
        getParentCommitShaFn,
      })
    ).rejects.toThrow(
      `Could not find an existing snapshot to use as a baseline for '${requestedSha}'`
    );

    expect(snapshotExistsFn).toHaveBeenCalledTimes(12);
    expect(getParentCommitShaFn).toHaveBeenCalledTimes(3);
  });
});
