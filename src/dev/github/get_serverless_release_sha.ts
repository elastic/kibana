/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Octokit } from '@octokit/rest';
import pRetry, { type FailedAttemptError } from 'p-retry';

// Keep in sync with packages/kbn-check-saved-objects-cli/src/snapshots/resolve_snapshot_sha.ts
export const TRANSIENT_HTTP_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
export const RETRY_DELAY_MS = 3_000;
export const MAX_RETRIES = 5;

const TRANSIENT_NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'EPIPE',
]);

export const isTransientHttpError = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number' && TRANSIENT_HTTP_STATUS_CODES.has(status)) {
      return true;
    }
  }

  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && TRANSIENT_NETWORK_ERROR_CODES.has(code)) {
      return true;
    }
  }

  return false;
};

export async function fetchServerlessReleaseShaFromGitHub(octokit: Octokit): Promise<string> {
  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  const fileContent = Buffer.from(
    (releasesFile.data as { content: string }).content,
    'base64'
  ).toString('utf8');
  const sha = fileContent.match(`qa-ds-1: "([a-z0-9]+)"`)?.[1];
  if (sha) {
    return sha;
  }

  throw new Error('Cannot find QA field (qa-ds-1) in versions.yaml');
}

export async function withTransientHttpRetry<T>(fn: () => Promise<T>): Promise<T> {
  return pRetry(fn, {
    retries: MAX_RETRIES,
    minTimeout: RETRY_DELAY_MS,
    factor: 1,
    onFailedAttempt: (error: FailedAttemptError) => {
      if (!isTransientHttpError(error)) {
        throw error;
      }
    },
  });
}

export async function getServerlessReleaseSha(): Promise<string> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Missing environment variable: GITHUB_TOKEN');
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  return withTransientHttpRetry(() => fetchServerlessReleaseShaFromGitHub(octokit));
}
