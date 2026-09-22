/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

import type { Octokit } from '@octokit/rest';
import {
  fetchServerlessReleaseShaFromGitHub,
  isTransientHttpError,
  withTransientHttpRetry,
} from './get_serverless_release_sha';

const createHttpError = (status: number, message = 'request failed') =>
  Object.assign(new Error(message), { status });

describe('isTransientHttpError', () => {
  it.each([408, 429, 500, 502, 503, 504])('returns true for HTTP %i', (status) => {
    expect(isTransientHttpError(createHttpError(status))).toBe(true);
  });

  it('returns false for non-retryable HTTP errors', () => {
    expect(isTransientHttpError(createHttpError(404, 'not found'))).toBe(false);
  });

  it('returns true for transient network errors', () => {
    const error = new Error('socket hang up') as NodeJS.ErrnoException;
    error.code = 'ECONNRESET';
    expect(isTransientHttpError(error)).toBe(true);
  });
});

describe('withTransientHttpRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries transient HTTP failures before succeeding', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(createHttpError(502, 'bad gateway'))
      .mockRejectedValueOnce(createHttpError(502, 'bad gateway'))
      .mockResolvedValueOnce('success');

    const resultPromise = withTransientHttpRetry(fn);
    await jest.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient HTTP failures', async () => {
    const fn = jest.fn().mockRejectedValue(createHttpError(404, 'not found'));

    await expect(withTransientHttpRetry(fn)).rejects.toThrow('not found');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchServerlessReleaseShaFromGitHub', () => {
  const qaSha = 'abc123def456';
  const versionsYaml = `qa-ds-1: "${qaSha}"`;

  const createOctokit = (request: jest.Mock) =>
    ({
      request,
    } as unknown as Octokit);

  it('returns the qa-ds-1 SHA from versions.yaml', async () => {
    const request = jest.fn().mockResolvedValue({
      data: {
        content: Buffer.from(versionsYaml, 'utf8').toString('base64'),
      },
    });

    await expect(fetchServerlessReleaseShaFromGitHub(createOctokit(request))).resolves.toBe(qaSha);
    expect(request).toHaveBeenCalledWith(`GET /repos/{owner}/{repo}/contents/{path}`, {
      owner: 'elastic',
      repo: 'serverless-gitops',
      path: 'services/kibana/versions.yaml',
    });
  });

  it('throws when qa-ds-1 is missing from versions.yaml', async () => {
    const request = jest.fn().mockResolvedValue({
      data: {
        content: Buffer.from('other-field: "value"', 'utf8').toString('base64'),
      },
    });

    await expect(fetchServerlessReleaseShaFromGitHub(createOctokit(request))).rejects.toThrow(
      'Cannot find QA field (qa-ds-1) in versions.yaml'
    );
  });
});
