/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IHttpInterceptController,
  HttpFetchOptionsWithPath,
  HttpInterceptor,
} from '@kbn/core-http-browser';
import { mockGetRetryAfter, mockIsRateLimiterError } from './utils.mock';
import { rateLimiterInterceptor } from './interceptor';

describe('rateLimiterInterceptor', () => {
  describe('fetch', () => {
    let controller: jest.Mocked<IHttpInterceptController>;
    let next: jest.MockedFunction<Parameters<Required<HttpInterceptor>['fetch']>[0]>;
    let options: HttpFetchOptionsWithPath;

    beforeEach(() => {
      jest.useFakeTimers();
      controller = {
        halted: false,
        halt: jest.fn(),
      };
      next = jest.fn();
      options = {} as typeof options;
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.resetAllMocks();
    });

    it('should retry throttled requests', async () => {
      const response = {} as ReturnType<typeof next>;
      mockIsRateLimiterError.mockReturnValue(true);
      next.mockRejectedValueOnce(new Error('Throttled'));
      next.mockResolvedValueOnce(response);

      const result = rateLimiterInterceptor.fetch!(next, options, controller);
      await jest.runAllTimersAsync();
      await expect(result).resolves.toBe(response);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should wait between attempts', async () => {
      const response = {} as ReturnType<typeof next>;
      mockIsRateLimiterError.mockReturnValue(true);
      mockGetRetryAfter.mockReturnValue(10);
      next.mockRejectedValueOnce(new Error('Throttled'));
      next.mockResolvedValueOnce(response);

      const result = rateLimiterInterceptor.fetch!(next, options, controller);
      await jest.advanceTimersByTimeAsync(5000);
      expect(next).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(5000);
      expect(next).toHaveBeenCalledTimes(2);
      await expect(result).resolves.toBe(response);
    });

    it('should throw immediately if not a rate limiter error', async () => {
      const error = new Error('Not throttled');
      mockIsRateLimiterError.mockReturnValue(false);
      next.mockRejectedValueOnce(error);

      await expect(rateLimiterInterceptor.fetch!(next, options, controller)).rejects.toBe(error);
    });

    it('should throw if controller is halted', async () => {
      const error = new Error('Throttled');
      mockIsRateLimiterError.mockReturnValue(true);
      mockGetRetryAfter.mockReturnValue(10);
      next.mockRejectedValueOnce(error);

      const result = expect(rateLimiterInterceptor.fetch!(next, options, controller)).rejects.toBe(
        error
      );
      await jest.advanceTimersByTimeAsync(5000);
      controller.halted = true;
      await jest.advanceTimersByTimeAsync(5000);
      await result;

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should throw if maximum attempts are reached', async () => {
      const error = new Error('Throttled');
      mockIsRateLimiterError.mockReturnValue(true);
      mockGetRetryAfter.mockReturnValue(10);
      next.mockRejectedValue(error);

      const result = expect(rateLimiterInterceptor.fetch!(next, options, controller)).rejects.toBe(
        error
      );
      await jest.runAllTimersAsync();
      await result;

      expect(next).toHaveBeenCalledTimes(3); // 3 attempts
    });
  });
});
