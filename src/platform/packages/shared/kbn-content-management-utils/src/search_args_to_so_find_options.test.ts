/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { searchArgsToSOFindOptionsDefault } from './saved_object_content_storage';
import type { SearchQuery } from '@kbn/content-management-plugin/common';

describe('searchArgsToSOFindOptionsDefault', () => {
  const baseQuery: SearchQuery = {
    text: 'test query',
    limit: 10,
  };

  const baseParams = {
    contentTypeId: 'test-type',
    query: baseQuery,
    options: {
      searchFields: ['title', 'description'],
      fields: ['title', 'description'],
    },
  };

  it('should convert basic search parameters', () => {
    const result = searchArgsToSOFindOptionsDefault(baseParams);

    expect(result).toEqual({
      type: 'test-type',
      search: 'test query',
      perPage: 10,
      page: undefined,
      defaultSearchOperator: 'AND',
      searchFields: ['title', 'description'],
      fields: ['title', 'description'],
    });
  });

  it('should handle cursor pagination', () => {
    const result = searchArgsToSOFindOptionsDefault({
      ...baseParams,
      query: { ...baseQuery, cursor: '2' },
    });

    expect(result.page).toBe(2);
  });

  describe('sorting', () => {
    it('should pass sort field and direction when provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        ...baseParams,
        query: {
          ...baseQuery,
          sort: {
            field: 'title',
            direction: 'asc',
          },
        },
      });

      expect(result.sortField).toBe('title');
      expect(result.sortOrder).toBe('asc');
    });

    it('should handle descending sort order', () => {
      const result = searchArgsToSOFindOptionsDefault({
        ...baseParams,
        query: {
          ...baseQuery,
          sort: {
            field: 'updatedAt',
            direction: 'desc',
          },
        },
      });

      expect(result.sortField).toBe('updatedAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should not add sort fields when sort is not provided', () => {
      const result = searchArgsToSOFindOptionsDefault(baseParams);

      expect(result.sortField).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
    });

    it('should handle common sort fields', () => {
      const sortFields = ['title', 'updatedAt', 'createdAt'];

      sortFields.forEach((field) => {
        const result = searchArgsToSOFindOptionsDefault({
          ...baseParams,
          query: {
            ...baseQuery,
            sort: {
              field,
              direction: 'asc',
            },
          },
        });

        expect(result.sortField).toBe(field);
        expect(result.sortOrder).toBe('asc');
      });
    });
  });

  describe('tags', () => {
    it('should handle included tags', () => {
      const result = searchArgsToSOFindOptionsDefault({
        ...baseParams,
        query: {
          ...baseQuery,
          tags: {
            included: ['tag1', 'tag2'],
          },
        },
      });

      expect(result.hasReference).toEqual([
        { id: 'tag1', type: 'tag' },
        { id: 'tag2', type: 'tag' },
      ]);
    });

    it('should handle excluded tags', () => {
      const result = searchArgsToSOFindOptionsDefault({
        ...baseParams,
        query: {
          ...baseQuery,
          tags: {
            excluded: ['tag3', 'tag4'],
          },
        },
      });

      expect(result.hasNoReference).toEqual([
        { id: 'tag3', type: 'tag' },
        { id: 'tag4', type: 'tag' },
      ]);
    });
  });
});
