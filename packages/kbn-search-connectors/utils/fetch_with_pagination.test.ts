/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import { fetchWithPagination } from './fetch_with_pagination';

describe('fetchWithPagination util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchWithPagination', () => {
    it('should fetch mock data with pagination', async () => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() =>
        Promise.resolve({
          hits: { hits: ['result1', 'result2'], total: 2 },
        } as any as SearchResponse<string>)
      );
      await expect(fetchWithPagination(mockFn, 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 2,
          },
        },
        data: ['result1', 'result2'],
      });
    });
    it('should return empty result if size is 0', async () => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() =>
        Promise.resolve({
          hits: { hits: [], total: 0 },
        } as any as SearchResponse<string>)
      );
      await expect(fetchWithPagination(mockFn, 0, 0)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
    });
    it('should handle total as an object correctly', async () => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() =>
        Promise.resolve({
          hits: {
            hits: [],
            total: {
              relation: 'lte',
              value: 555,
            },
          },
        } as any as SearchResponse<string>)
      );
      await expect(fetchWithPagination(mockFn, 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 555,
          },
        },
        data: [],
      });
    });

    it('should handle undefined total correctly', async () => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() =>
        Promise.resolve({
          hits: {
            hits: [],
            total: undefined,
          },
        } as any as SearchResponse<string>)
      );
      await expect(fetchWithPagination(mockFn, 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
    });

    it('should handle has_more_hits_than_total correctly', async () => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() =>
        Promise.resolve({
          hits: { hits: ['result1', 'result2'], total: { relation: 'gte', value: 10000 } },
        } as any as SearchResponse<string>)
      );
      await expect(fetchWithPagination(mockFn, 50, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 50,
            has_more_hits_than_total: true,
            size: 10,
            total: 10000,
          },
        },
        data: ['result1', 'result2'],
      });
    });
  });
});
