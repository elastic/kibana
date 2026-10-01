/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type supertest from 'supertest';
import type { ScoutLogger } from '../../../../common/services/logger';
import { getEluRetryDelayMs, withEluRetry } from './api_client_rate_limiter';

const eluLimited = (retryAfter = '30'): supertest.Response =>
  ({
    status: 429,
    text: 'Server is overloaded',
    headers: { ratelimit: `"elu";r=0;t=${retryAfter}`, 'retry-after': retryAfter },
  } as unknown as supertest.Response);

const ok = (): supertest.Response =>
  ({ status: 200, headers: {} } as unknown as supertest.Response);

const log = { warning: jest.fn() } as unknown as ScoutLogger;

describe('api_client_rate_limiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getEluRetryDelayMs', () => {
    it('returns the advertised Retry-After in milliseconds', () => {
      expect(getEluRetryDelayMs(eluLimited('30'))).toBe(30_000);
    });

    it('returns undefined for a 429 that does not come from the ELU limiter', () => {
      const proxyLimited = {
        status: 429,
        headers: { 'retry-after': '1' },
      } as unknown as supertest.Response;

      expect(getEluRetryDelayMs(proxyLimited)).toBeUndefined();
    });

    it('returns undefined for a successful response', () => {
      expect(getEluRetryDelayMs(ok())).toBeUndefined();
    });

    it('returns undefined when the limiter asks for longer than a test can wait', () => {
      expect(getEluRetryDelayMs(eluLimited('600'))).toBeUndefined();
    });
  });

  describe('withEluRetry', () => {
    it('re-issues the request once after waiting out Retry-After', async () => {
      const issueRequest = jest
        .fn()
        .mockResolvedValueOnce(eluLimited('30'))
        .mockResolvedValue(ok());

      const promise = withEluRetry(issueRequest, { log, requestDescription: 'GET /api/test' });
      await jest.advanceTimersByTimeAsync(30_000);

      expect(await promise).toEqual(ok());
      expect(issueRequest).toHaveBeenCalledTimes(2);
    });

    it('returns the 429 instead of retrying indefinitely', async () => {
      const issueRequest = jest.fn().mockResolvedValue(eluLimited('30'));

      const promise = withEluRetry(issueRequest, { log, requestDescription: 'GET /api/test' });
      await jest.advanceTimersByTimeAsync(30_000);

      expect((await promise).status).toBe(429);
      expect(issueRequest).toHaveBeenCalledTimes(2);
    });

    it('logs the 429 headers and body so the failure is diagnosable', async () => {
      const issueRequest = jest.fn().mockResolvedValue(eluLimited('30'));

      const promise = withEluRetry(issueRequest, { log, requestDescription: 'GET /api/test' });
      await jest.advanceTimersByTimeAsync(30_000);
      await promise;

      expect(log.warning).toHaveBeenCalledWith(
        expect.stringContaining(
          'RateLimit: "elu";r=0;t=30, Retry-After: 30, body: Server is overloaded'
        )
      );
    });

    it('does not retry a response the limiter did not reject', async () => {
      const issueRequest = jest.fn().mockResolvedValue(ok());

      expect(
        await withEluRetry(issueRequest, { log, requestDescription: 'GET /api/test' })
      ).toEqual(ok());
      expect(issueRequest).toHaveBeenCalledTimes(1);
      expect(log.warning).not.toHaveBeenCalled();
    });
  });
});
