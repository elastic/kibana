/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { transformHits, userInfoMapToRecord } from './transformers';
import type { UserInfo } from './types';

describe('transformers', () => {
  describe('transformHits', () => {
    const createMockHit = (
      overrides: Partial<{
        _id: string;
        _source: Record<string, unknown>;
      }> = {}
    ): estypes.SearchHit<Record<string, unknown>> => ({
      _index: '.kibana',
      _id: overrides._id ?? 'dashboard:test-id',
      _source: overrides._source ?? {
        type: 'dashboard',
        dashboard: {
          title: 'Test Dashboard',
          description: 'A test dashboard',
        },
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_by: 'u_updater',
        created_by: 'u_creator',
        managed: false,
        references: [
          { type: 'tag', id: 'tag1', name: 'Tag 1' },
          { type: 'index-pattern', id: 'ip1', name: 'Index Pattern' },
        ],
      },
    });

    it('should transform a basic hit with all fields', () => {
      const hits = [createMockHit()];
      const result = transformHits(hits);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'test-id',
        type: 'dashboard',
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedBy: 'u_updater',
        createdBy: 'u_creator',
        managed: false,
        references: [{ type: 'tag', id: 'tag1', name: 'Tag 1' }],
        attributes: {
          title: 'Test Dashboard',
          description: 'A test dashboard',
        },
      });
    });

    it('should filter references to only include tags', () => {
      const hits = [createMockHit()];
      const result = transformHits(hits);

      expect(result[0].references).toHaveLength(1);
      expect(result[0].references[0].type).toBe('tag');
    });

    it('should extract id from raw document id with type prefix', () => {
      const hits = [createMockHit({ _id: 'dashboard:my-dashboard-id' })];
      const result = transformHits(hits);

      expect(result[0].id).toBe('my-dashboard-id');
    });

    it('should extract id from namespaced raw document id', () => {
      const hits = [
        createMockHit({
          _id: 'custom-space:dashboard:my-dashboard-id',
          _source: {
            type: 'dashboard',
            namespace: 'custom-space',
            dashboard: { title: 'Test' },
            references: [],
          },
        }),
      ];
      const result = transformHits(hits);

      expect(result[0].id).toBe('my-dashboard-id');
    });

    it('should handle missing attributes gracefully', () => {
      const hits = [
        createMockHit({
          _source: {
            type: 'dashboard',
            dashboard: {},
            references: [],
          },
        }),
      ];
      const result = transformHits(hits);

      expect(result[0].attributes.title).toBeUndefined();
      expect(result[0].attributes.description).toBeUndefined();
    });

    it('should include additional attributes when requested', () => {
      const hits = [
        createMockHit({
          _source: {
            type: 'dashboard',
            dashboard: {
              title: 'Test',
              description: 'Desc',
              customAttr: 'custom value',
              numericAttr: 42,
            },
            references: [],
          },
        }),
      ];
      const result = transformHits(hits, ['customAttr', 'numericAttr']);

      expect(result[0].attributes.customAttr).toBe('custom value');
      expect(result[0].attributes.numericAttr).toBe(42);
    });

    it('should skip baseline attributes in additional attributes', () => {
      const hits = [
        createMockHit({
          _source: {
            type: 'dashboard',
            dashboard: {
              title: 'Original Title',
              description: 'Original Desc',
            },
            references: [],
          },
        }),
      ];
      const result = transformHits(hits, ['title', 'description']);

      // Should have title and description from the baseline transform, not duplicated.
      expect(result[0].attributes.title).toBe('Original Title');
      expect(result[0].attributes.description).toBe('Original Desc');
    });

    it('should handle empty hits array', () => {
      const result = transformHits([]);
      expect(result).toEqual([]);
    });

    it('should handle hits with empty references', () => {
      const hits = [
        createMockHit({
          _source: {
            type: 'dashboard',
            dashboard: { title: 'Test' },
            references: [],
          },
        }),
      ];
      const result = transformHits(hits);

      expect(result[0].references).toEqual([]);
    });

    it('should handle hits without references field', () => {
      const hits = [
        createMockHit({
          _source: {
            type: 'dashboard',
            dashboard: { title: 'Test' },
          },
        }),
      ];
      const result = transformHits(hits);

      expect(result[0].references).toEqual([]);
    });
  });

  describe('userInfoMapToRecord', () => {
    it('should convert a map to a record', () => {
      const userInfoMap = new Map<string, UserInfo>([
        [
          'u_creator',
          {
            username: 'creator_user',
            email: 'creator@example.com',
            fullName: 'Creator User',
          },
        ],
        [
          'u_updater',
          {
            username: 'updater_user',
            email: 'updater@example.com',
            fullName: 'Updater User',
          },
        ],
      ]);

      const result = userInfoMapToRecord(userInfoMap);

      expect(result).toEqual({
        u_creator: {
          username: 'creator_user',
          email: 'creator@example.com',
          fullName: 'Creator User',
        },
        u_updater: {
          username: 'updater_user',
          email: 'updater@example.com',
          fullName: 'Updater User',
        },
      });
    });

    it('should return undefined for an empty map', () => {
      const userInfoMap = new Map<string, UserInfo>();
      const result = userInfoMapToRecord(userInfoMap);

      expect(result).toBeUndefined();
    });

    it('should handle a single entry', () => {
      const userInfoMap = new Map<string, UserInfo>([['u_single', { username: 'single_user' }]]);

      const result = userInfoMapToRecord(userInfoMap);

      expect(result).toEqual({
        u_single: { username: 'single_user' },
      });
    });
  });
});
