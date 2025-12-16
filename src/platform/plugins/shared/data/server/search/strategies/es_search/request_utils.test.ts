/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getShardTimeout, getDefaultSearchParams, getProjectRouting } from './request_utils';
import type { IUiSettingsClient, SharedGlobalConfig } from '@kbn/core/server';

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

  describe('getProjectRouting', () => {
    describe('with params.project_routing structure (ES|QL)', () => {
      test('returns sanitized value when project_routing is "_alias:_origin"', () => {
        const result = getProjectRouting({ project_routing: '_alias:_origin' } as any);
        expect(result).toBe('_alias:_origin');
      });

      test('returns undefined when project_routing is "_alias:*"', () => {
        const result = getProjectRouting({ project_routing: '_alias:*' } as any);
        expect(result).toBeUndefined();
      });

      test('returns undefined when project_routing is not set', () => {
        const result = getProjectRouting({} as any);
        expect(result).toBeUndefined();
      });

      test('returns undefined when params is undefined', () => {
        const result = getProjectRouting(undefined);
        expect(result).toBeUndefined();
      });
    });

    describe('with params.body.project_routing structure (SearchSource)', () => {
      test('returns sanitized value when body.project_routing is "_alias:_origin"', () => {
        const result = getProjectRouting({ body: { project_routing: '_alias:_origin' } } as any);
        expect(result).toBe('_alias:_origin');
      });

      test('returns undefined when body.project_routing is "_alias:*"', () => {
        const result = getProjectRouting({ body: { project_routing: '_alias:*' } } as any);
        expect(result).toBeUndefined();
      });

      test('returns undefined when body.project_routing is not set', () => {
        const result = getProjectRouting({ body: {} } as any);
        expect(result).toBeUndefined();
      });
    });

    describe('precedence - params.body.project_routing over params.project_routing', () => {
      test('uses body.project_routing when both are present', () => {
        const result = getProjectRouting({
          project_routing: '_alias:*',
          body: { project_routing: '_alias:_origin' },
        } as any);
        expect(result).toBe('_alias:_origin');
      });

      test('falls back to params.project_routing when body exists but no project_routing', () => {
        const result = getProjectRouting({
          project_routing: '_alias:_origin',
          body: {},
        } as any);
        expect(result).toBe('_alias:_origin');
      });
    });
  });
});
