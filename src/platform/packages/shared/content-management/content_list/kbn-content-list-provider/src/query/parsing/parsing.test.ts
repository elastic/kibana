/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  sanitizeFilterValue,
  sanitizeFilterValues,
  getAllCustomFilterKeys,
  buildQuerySchema,
  parseQueryText,
  extractTags,
} from '.';
import type { FilteringConfig } from '../../features/filtering';

describe('parsing', () => {
  describe('sanitizeFilterValue', () => {
    it('should return sanitized string for valid input', () => {
      expect(sanitizeFilterValue('user-123')).toBe('user-123');
      expect(sanitizeFilterValue('user_name')).toBe('user_name');
      expect(sanitizeFilterValue('user.name')).toBe('user.name');
      expect(sanitizeFilterValue('user@example.com')).toBe('user@example.com');
      expect(sanitizeFilterValue('user name')).toBe('user name');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilterValue('  user-123  ')).toBe('user-123');
    });

    it('should return undefined for invalid characters', () => {
      expect(sanitizeFilterValue('user<script>')).toBeUndefined();
      expect(sanitizeFilterValue('user{123}')).toBeUndefined();
      expect(sanitizeFilterValue('user[123]')).toBeUndefined();
      expect(sanitizeFilterValue('user(123)')).toBeUndefined();
      expect(sanitizeFilterValue('user|123')).toBeUndefined();
    });

    it('should return undefined for non-string input', () => {
      expect(sanitizeFilterValue(123)).toBeUndefined();
      expect(sanitizeFilterValue(null)).toBeUndefined();
      expect(sanitizeFilterValue(undefined)).toBeUndefined();
      expect(sanitizeFilterValue({})).toBeUndefined();
      expect(sanitizeFilterValue([])).toBeUndefined();
    });

    it('should return undefined for empty string after trim', () => {
      expect(sanitizeFilterValue('')).toBeUndefined();
      expect(sanitizeFilterValue('   ')).toBeUndefined();
    });
  });

  describe('sanitizeFilterValues', () => {
    it('should sanitize array of valid values', () => {
      expect(sanitizeFilterValues(['user-1', 'user-2', 'user-3'])).toEqual([
        'user-1',
        'user-2',
        'user-3',
      ]);
    });

    it('should filter out invalid values', () => {
      expect(sanitizeFilterValues(['user-1', 'user<script>', 'user-2', 123])).toEqual([
        'user-1',
        'user-2',
      ]);
    });

    it('should handle empty array', () => {
      expect(sanitizeFilterValues([])).toEqual([]);
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilterValues(['  user-1  ', 'user-2'])).toEqual(['user-1', 'user-2']);
    });
  });

  describe('getAllCustomFilterKeys', () => {
    it('should return empty array when filteringConfig is undefined', () => {
      expect(getAllCustomFilterKeys(undefined)).toEqual([]);
    });

    it('should return empty array when custom filters are not defined', () => {
      const config: FilteringConfig = {
        tags: true,
        users: true,
      };
      expect(getAllCustomFilterKeys(config)).toEqual([]);
    });

    it('should return custom filter keys', () => {
      const config: FilteringConfig = {
        custom: {
          status: {
            name: 'Status',
            options: [],
          },
          priority: {
            name: 'Priority',
            options: [],
          },
        },
      };
      expect(getAllCustomFilterKeys(config)).toEqual(['status', 'priority']);
    });

    it('should return empty array when custom is empty object', () => {
      const config: FilteringConfig = {
        custom: {},
      };
      expect(getAllCustomFilterKeys(config)).toEqual([]);
    });
  });

  describe('buildQuerySchema', () => {
    it('should build schema with default fields', () => {
      const schema = buildQuerySchema([]);
      expect(schema.fields).toHaveProperty('starred');
      expect(schema.fields).toHaveProperty('createdBy');
      expect(schema.fields.starred.type).toBe('boolean');
      expect(schema.fields.createdBy.type).toBe('string');
    });

    it('should include custom filter keys', () => {
      const schema = buildQuerySchema(['status', 'priority']);
      expect(schema.fields).toHaveProperty('status');
      expect(schema.fields).toHaveProperty('priority');
      expect(schema.fields.status.type).toBe('string');
      expect(schema.fields.priority.type).toBe('string');
    });

    it('should default to strict mode', () => {
      const schema = buildQuerySchema([]);
      expect(schema.strict).toBe(true);
    });

    it('should respect strict option', () => {
      const schema = buildQuerySchema([], { strict: false });
      expect(schema.strict).toBe(false);
    });

    it('should handle empty custom filter keys', () => {
      const schema = buildQuerySchema([]);
      expect(Object.keys(schema.fields)).toEqual(['starred', 'createdBy']);
    });
  });

  describe('extractTags', () => {
    const tagList = [
      { id: 'tag-1', name: 'Important' },
      { id: 'tag-2', name: 'Archived' },
      { id: 'tag-3', name: 'Review' },
    ];

    it('should extract tag IDs from query text', () => {
      const result = extractTags('tag:Important dashboard', tagList);
      expect(result.tagIds).toEqual(['tag-1']);
      expect(result.tagIdsToExclude).toBeUndefined();
    });

    it('should extract multiple tags', () => {
      const result = extractTags('tag:Important tag:Review dashboard', tagList);
      expect(result.tagIds).toEqual(['tag-1', 'tag-3']);
    });

    it('should handle OR syntax', () => {
      const result = extractTags('tag:(Important OR Review) dashboard', tagList);
      expect(result.tagIds).toContain('tag-1');
      expect(result.tagIds).toContain('tag-3');
    });

    it('should handle exclusion syntax', () => {
      const result = extractTags('-tag:Archived dashboard', tagList);
      expect(result.tagIdsToExclude).toEqual(['tag-2']);
    });

    it('should return clean text for OR field clauses', () => {
      // Note: EUI Query's removeOrFieldClauses only removes OR clauses like tag:(a OR b),
      // not simple field clauses like tag:value. This is a known limitation.
      const result = extractTags('tag:(Important OR Review) dashboard', tagList);
      // After removing OR field clause, the tag syntax should be gone.
      expect(result.cleanText).not.toContain('tag:');
    });

    it('should return original text when no tags found', () => {
      const result = extractTags('simple dashboard search', tagList);
      expect(result.tagIds).toBeUndefined();
      expect(result.tagIdsToExclude).toBeUndefined();
      expect(result.cleanText).toBe('simple dashboard search');
    });

    it('should handle unknown tag names gracefully', () => {
      const result = extractTags('tag:Unknown dashboard', tagList);
      expect(result.tagIds).toBeUndefined();
    });
  });

  describe('parseQueryText', () => {
    it('should return default values for undefined query text', () => {
      const result = parseQueryText(undefined);
      expect(result).toEqual({
        tagIds: undefined,
        tagIdsToExclude: undefined,
        starredOnly: false,
        users: undefined,
        customFilters: {},
        cleanSearchQuery: undefined,
      });
    });

    it('should return default values for empty query text', () => {
      const result = parseQueryText('');
      expect(result).toEqual({
        tagIds: undefined,
        tagIdsToExclude: undefined,
        starredOnly: false,
        users: undefined,
        customFilters: {},
        cleanSearchQuery: undefined,
      });
    });

    it('should extract is:starred clause', () => {
      const result = parseQueryText('is:starred test query');
      expect(result.starredOnly).toBe(true);
      expect(result.cleanSearchQuery).toBe('test query');
    });

    it('should extract createdBy clause', () => {
      const result = parseQueryText('createdBy:user-1 test query');
      expect(result.users).toEqual(['user-1']);
      expect(result.cleanSearchQuery).toBe('test query');
    });

    it('should extract tags when tagList is provided', () => {
      const tagList = [{ id: 'tag-1', name: 'Important' }];
      const result = parseQueryText('tag:Important dashboard', { tagList });
      expect(result.tagIds).toEqual(['tag-1']);
    });

    it('should extract custom filters when filteringConfig is provided', () => {
      const filteringConfig: FilteringConfig = {
        custom: {
          status: { name: 'Status', options: [] },
        },
      };
      const result = parseQueryText('status:active test', { filteringConfig });
      expect(result.customFilters.status).toEqual(['active']);
    });

    it('should handle combined filters', () => {
      const tagList = [{ id: 'tag-1', name: 'Important' }];
      const filteringConfig: FilteringConfig = {
        custom: { status: { name: 'Status', options: [] } },
      };
      const result = parseQueryText(
        'tag:Important is:starred createdBy:alice status:active search',
        {
          tagList,
          filteringConfig,
        }
      );

      expect(result.tagIds).toEqual(['tag-1']);
      expect(result.starredOnly).toBe(true);
      expect(result.users).toEqual(['alice']);
      expect(result.customFilters.status).toEqual(['active']);
      expect(result.cleanSearchQuery).toBe('search');
    });

    it('should handle query with only search text', () => {
      const result = parseQueryText('simple search query');
      expect(result.starredOnly).toBe(false);
      expect(result.users).toBeUndefined();
      expect(result.cleanSearchQuery).toBe('simple search query');
    });
  });
});
