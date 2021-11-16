/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getShardTimeout, getDefaultSearchParams } from './request_utils';
import { IUiSettingsClient, SharedGlobalConfig } from 'kibana/server';

describe('request utils', () => {
  describe('getShardTimeout', () => {
    test('returns an empty object if the config does not contain a value', () => {
      const result = getShardTimeout({
        elasticsearch: {
          shardTimeout: {
            asMilliseconds: jest.fn(),
          },
        },
      } as unknown as SharedGlobalConfig);
      expect(result).toEqual({});
    });

    test('returns an empty object if the config contains 0', () => {
      const result = getShardTimeout({
        elasticsearch: {
          shardTimeout: {
            asMilliseconds: jest.fn().mockReturnValue(0),
          },
        },
      } as unknown as SharedGlobalConfig);
      expect(result).toEqual({});
    });

    test('returns a duration if the config >= 0', () => {
      const result = getShardTimeout({
        elasticsearch: {
          shardTimeout: {
            asMilliseconds: jest.fn().mockReturnValue(10),
          },
        },
      } as unknown as SharedGlobalConfig);
      expect(result).toEqual({ timeout: '10ms' });
    });
  });

  describe('getDefaultSearchParams', () => {
    describe('max_concurrent_shard_requests', () => {
      test('returns value if > 0', async () => {
        const result = await getDefaultSearchParams({
          get: jest.fn().mockResolvedValue(1),
        } as unknown as IUiSettingsClient);
        expect(result).toHaveProperty('max_concurrent_shard_requests', 1);
      });

      test('returns undefined if === 0', async () => {
        const result = await getDefaultSearchParams({
          get: jest.fn().mockResolvedValue(0),
        } as unknown as IUiSettingsClient);
        expect(result.max_concurrent_shard_requests).toBe(undefined);
      });

      test('returns undefined if undefined', async () => {
        const result = await getDefaultSearchParams({
          get: jest.fn(),
        } as unknown as IUiSettingsClient);
        expect(result.max_concurrent_shard_requests).toBe(undefined);
      });
    });

    describe('other defaults', () => {
      test('returns ignore_unavailable and track_total_hits', async () => {
        const result = await getDefaultSearchParams({
          get: jest.fn(),
        } as unknown as IUiSettingsClient);
        expect(result).toHaveProperty('ignore_unavailable', true);
        expect(result).toHaveProperty('track_total_hits', true);
      });
    });
  });
});
