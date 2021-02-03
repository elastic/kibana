/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getShardTimeout, getDefaultSearchParams, shimAbortSignal } from './request_utils';
import { IUiSettingsClient, SharedGlobalConfig } from 'kibana/server';

const createSuccessTransportRequestPromise = (
  body: any,
  { statusCode = 200 }: { statusCode?: number } = {}
) => {
  const promise = Promise.resolve({ body, statusCode }) as any;
  promise.abort = jest.fn();

  return promise;
};

describe('request utils', () => {
  describe('getShardTimeout', () => {
    test('returns an empty object if the config does not contain a value', () => {
      const result = getShardTimeout(({
        elasticsearch: {
          shardTimeout: {
            asMilliseconds: jest.fn(),
          },
        },
      } as unknown) as SharedGlobalConfig);
      expect(result).toEqual({});
    });

    test('returns an empty object if the config contains 0', () => {
      const result = getShardTimeout(({
        elasticsearch: {
          shardTimeout: {
            asMilliseconds: jest.fn().mockReturnValue(0),
          },
        },
      } as unknown) as SharedGlobalConfig);
      expect(result).toEqual({});
    });

    test('returns a duration if the config >= 0', () => {
      const result = getShardTimeout(({
        elasticsearch: {
          shardTimeout: {
            asMilliseconds: jest.fn().mockReturnValue(10),
          },
        },
      } as unknown) as SharedGlobalConfig);
      expect(result).toEqual({ timeout: '10ms' });
    });
  });

  describe('getDefaultSearchParams', () => {
    describe('max_concurrent_shard_requests', () => {
      test('returns value if > 0', async () => {
        const result = await getDefaultSearchParams(({
          get: jest.fn().mockResolvedValue(1),
        } as unknown) as IUiSettingsClient);
        expect(result).toHaveProperty('max_concurrent_shard_requests', 1);
      });

      test('returns undefined if === 0', async () => {
        const result = await getDefaultSearchParams(({
          get: jest.fn().mockResolvedValue(0),
        } as unknown) as IUiSettingsClient);
        expect(result.max_concurrent_shard_requests).toBe(undefined);
      });

      test('returns undefined if undefined', async () => {
        const result = await getDefaultSearchParams(({
          get: jest.fn(),
        } as unknown) as IUiSettingsClient);
        expect(result.max_concurrent_shard_requests).toBe(undefined);
      });
    });

    describe('other defaults', () => {
      test('returns ignore_unavailable and track_total_hits', async () => {
        const result = await getDefaultSearchParams(({
          get: jest.fn(),
        } as unknown) as IUiSettingsClient);
        expect(result).toHaveProperty('ignore_unavailable', true);
        expect(result).toHaveProperty('track_total_hits', true);
      });
    });
  });

  describe('shimAbortSignal', () => {
    test('aborts the promise if the signal is already aborted', async () => {
      const promise = createSuccessTransportRequestPromise({
        success: true,
      });
      const controller = new AbortController();
      controller.abort();
      shimAbortSignal(promise, controller.signal);

      expect(promise.abort).toHaveBeenCalled();
    });

    test('aborts the promise if the signal is aborted', () => {
      const promise = createSuccessTransportRequestPromise({
        success: true,
      });
      const controller = new AbortController();
      shimAbortSignal(promise, controller.signal);
      controller.abort();

      expect(promise.abort).toHaveBeenCalled();
    });

    test('returns the original promise', async () => {
      const promise = createSuccessTransportRequestPromise({
        success: true,
      });
      const controller = new AbortController();
      const response = await shimAbortSignal(promise, controller.signal);

      expect(response).toEqual(expect.objectContaining({ body: { success: true } }));
    });

    test('allows the promise to be aborted manually', () => {
      const promise = createSuccessTransportRequestPromise({
        success: true,
      });
      const controller = new AbortController();
      const enhancedPromise = shimAbortSignal(promise, controller.signal);

      enhancedPromise.abort();
      expect(promise.abort).toHaveBeenCalled();
    });
  });
});
