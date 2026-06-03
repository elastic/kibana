/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import https from 'https';
import { assertCommitSha, expandGitRev } from '../util';
import { gcsSnapshotUrl } from './fetch_snapshot';

export const ATTEMPTS_PER_SHA = 3;
export const MAX_ANCESTOR_DEPTH = 3;
export const SNAPSHOT_FETCH_RETRY_DELAY_MS = 3_000;

export interface ResolvedSnapshotSha {
  requestedSha: string;
  resolvedSha: string;
  usedAncestorSnapshot: boolean;
}

export type SnapshotCheckResult =
  | { outcome: 'exists' }
  | { outcome: 'not_found' }
  | { outcome: 'transient_error' }
  | { outcome: 'terminal_error'; statusCode?: number };

const TRANSIENT_HTTP_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const snapshotExists = (sha: string): Promise<SnapshotCheckResult> => {
  const url = gcsSnapshotUrl(sha);
  if (!url) {
    return Promise.resolve({ outcome: 'not_found' });
  }

  return new Promise((resolve) => {
    const request = https.request(url, { method: 'HEAD' }, (response) => {
      response.resume();
      const statusCode = response.statusCode ?? 0;

      if (statusCode >= 200 && statusCode < 400) {
        resolve({ outcome: 'exists' });
        return;
      }

      if (statusCode === 404) {
        resolve({ outcome: 'not_found' });
        return;
      }

      if (TRANSIENT_HTTP_STATUS_CODES.has(statusCode)) {
        resolve({ outcome: 'transient_error' });
        return;
      }

      resolve({ outcome: 'terminal_error', statusCode });
    });

    request.on('error', () => resolve({ outcome: 'transient_error' }));
    request.end();
  });
};

/**
 * Returns the parent commit SHA for a given SHA.
 * Tries local git first, then falls back to the GitHub API.
 */
export const getParentCommitSha = (sha: string): string => {
  assertCommitSha(sha);

  try {
    return execFileSync('git', ['rev-parse', `${sha}^`], { stdio: ['pipe', 'pipe', null] })
      .toString()
      .trim();
  } catch {
    try {
      const parentSha = execFileSync(
        'gh',
        ['api', `repos/elastic/kibana/commits/${sha}`, '--jq', '.parents[0].sha'],
        {
          stdio: ['pipe', 'pipe', null],
        }
      )
        .toString()
        .trim();

      if (!parentSha || parentSha === 'null') {
        throw new Error('empty parent SHA');
      }

      return parentSha;
    } catch (err) {
      throw new Error(
        `Failed to resolve parent SHA for '${sha}' while searching for a baseline snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
};

export interface ResolveSnapshotShaOptions {
  attemptsPerSha?: number;
  maxAncestorDepth?: number;
  retryDelayMs?: number;
  snapshotExistsFn?: (sha: string) => Promise<SnapshotCheckResult>;
  getParentCommitShaFn?: (sha: string) => string;
}

/**
 * Resolves a commit SHA to the nearest available GCS snapshot SHA.
 * Retries fetching the requested SHA before walking up to {@link MAX_ANCESTOR_DEPTH}
 * parent commits, giving recently uploaded snapshots time to appear in GCS.
 * 404 responses are retried up to {@link ATTEMPTS_PER_SHA} times per SHA; transient
 * HTTP and socket errors are retried indefinitely on the same SHA.
 */
export const resolveSnapshotSha = async (
  requestedSha: string,
  {
    attemptsPerSha = ATTEMPTS_PER_SHA,
    maxAncestorDepth = MAX_ANCESTOR_DEPTH,
    retryDelayMs = SNAPSHOT_FETCH_RETRY_DELAY_MS,
    snapshotExistsFn = snapshotExists,
    getParentCommitShaFn = getParentCommitSha,
  }: ResolveSnapshotShaOptions = {}
): Promise<ResolvedSnapshotSha> => {
  const expandedRequestedSha = expandGitRev(requestedSha);
  let currentSha = expandedRequestedSha;

  for (let ancestorDepth = 0; ancestorDepth <= maxAncestorDepth; ancestorDepth++) {
    let notFoundAttempts = 0;

    while (notFoundAttempts < attemptsPerSha) {
      const result = await snapshotExistsFn(currentSha);

      if (result.outcome === 'exists') {
        return {
          requestedSha: expandedRequestedSha,
          resolvedSha: currentSha,
          usedAncestorSnapshot: currentSha !== expandedRequestedSha,
        };
      }

      if (result.outcome === 'terminal_error') {
        throw new Error(
          `Failed to check snapshot for '${currentSha}': unexpected HTTP ${
            result.statusCode ?? 'response'
          }`
        );
      }

      if (result.outcome === 'transient_error') {
        await sleep(retryDelayMs);
        continue;
      }

      notFoundAttempts++;
      if (notFoundAttempts < attemptsPerSha) {
        await sleep(retryDelayMs);
      }
    }

    if (ancestorDepth < maxAncestorDepth) {
      currentSha = getParentCommitShaFn(currentSha);
    }
  }

  throw new Error(
    `Could not find an existing snapshot to use as a baseline for '${expandedRequestedSha}'. Please rebase this PR branch onto the latest 'main' commit, then rerun CI.`
  );
};
