/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchSource } from './create_search_source';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../../../__mocks__/services';
import type { DiscoverAppState, TabStateGlobalState } from '../redux';
import type { Filter, Query } from '@kbn/es-query';

describe('createSearchSource', () => {
  const services = discoverServiceMock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('data view configuration', () => {
    it('should create a search source with a data view when provided', () => {
      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState: undefined,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('index')).toBe(dataViewMock);
    });

    it('should create a search source without a data view when undefined', () => {
      const searchSource = createSearchSource({
        dataView: undefined,
        appState: undefined,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('index')).toBeUndefined();
    });
  });

  describe('query and filter configuration', () => {
    const mockQuery: Query = {
      query: 'test query',
      language: 'kuery',
    };

    const mockAppFilter: Filter = {
      meta: { index: 'test-index', alias: 'app-filter' },
      query: { match_all: {} },
    };

    const mockGlobalFilter: Filter = {
      meta: { index: 'test-index', alias: 'global-filter' },
      query: { match_all: {} },
    };

    it('should set query and filters from appState', () => {
      const appState: DiscoverAppState = {
        query: mockQuery,
        filters: [mockAppFilter],
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('query')).toEqual(mockQuery);
      expect(searchSource.getField('filter')).toEqual([mockAppFilter]);
    });

    it('should combine app filters and global filters', () => {
      const appState: DiscoverAppState = {
        filters: [mockAppFilter],
      };

      const globalState: TabStateGlobalState = {
        filters: [mockGlobalFilter],
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState,
        services,
      });

      const filters = searchSource.getField('filter') as Filter[];
      expect(filters).toHaveLength(2);
      expect(filters[0]).toEqual(mockGlobalFilter);
      expect(filters[1]).toEqual(mockAppFilter);
    });

    it('should handle undefined filters in appState', () => {
      const appState: DiscoverAppState = {
        query: mockQuery,
        filters: undefined,
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('filter')).toEqual([]);
    });

    it('should handle undefined filters in globalState', () => {
      const appState: DiscoverAppState = {
        filters: [mockAppFilter],
      };

      const globalState: TabStateGlobalState = {
        filters: undefined,
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState,
        services,
      });

      expect(searchSource.getField('filter')).toEqual([mockAppFilter]);
    });

    it('should handle undefined query in appState', () => {
      const appState: DiscoverAppState = {
        query: undefined,
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('query')).toBeUndefined();
    });

    it('should clone filters to prevent mutation', () => {
      const originalAppFilter: Filter = {
        meta: { index: 'test-index', alias: 'app-filter' },
        query: { match_all: {} },
      };

      const originalGlobalFilter: Filter = {
        meta: { index: 'test-index', alias: 'global-filter' },
        query: { match_all: {} },
      };

      const appState: DiscoverAppState = {
        filters: [originalAppFilter],
      };

      const globalState: TabStateGlobalState = {
        filters: [originalGlobalFilter],
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState,
        services,
      });

      const filters = searchSource.getField('filter') as Filter[];

      // Modify the returned filters
      filters[0].meta.alias = 'modified-global';
      filters[1].meta.alias = 'modified-app';

      // Original filters should remain unchanged
      expect(originalGlobalFilter.meta.alias).toBe('global-filter');
      expect(originalAppFilter.meta.alias).toBe('app-filter');
    });

    it('should handle empty filter arrays', () => {
      const appState: DiscoverAppState = {
        filters: [],
      };

      const globalState: TabStateGlobalState = {
        filters: [],
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState,
        services,
      });

      expect(searchSource.getField('filter')).toEqual([]);
    });
  });

  describe('undefined state handling', () => {
    it('should handle undefined appState', () => {
      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState: undefined,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('query')).toBeUndefined();
      expect(searchSource.getField('filter')).toBeUndefined();
    });

    it('should handle undefined globalState with defined appState', () => {
      const appState: DiscoverAppState = {
        query: { query: 'test', language: 'kuery' },
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState: undefined,
        services,
      });

      expect(searchSource.getField('query')).toEqual(appState.query);
      expect(searchSource.getField('filter')).toEqual([]);
    });

    it('should create a minimal search source with all states undefined', () => {
      const searchSource = createSearchSource({
        dataView: undefined,
        appState: undefined,
        globalState: undefined,
        services,
      });

      expect(searchSource).toBeDefined();
      expect(searchSource.getField('index')).toBeUndefined();
      expect(searchSource.getField('query')).toBeUndefined();
      expect(searchSource.getField('filter')).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should configure search source with all parameters', () => {
      const appState: DiscoverAppState = {
        query: { query: 'status:active', language: 'kuery' },
        filters: [
          {
            meta: { index: 'test-index', alias: 'app-filter' },
            query: { match: { field: 'value' } },
          },
        ],
      };

      const globalState: TabStateGlobalState = {
        filters: [
          {
            meta: { index: 'test-index', alias: 'global-filter' },
            query: { range: { timestamp: { gte: 'now-1d' } } },
          },
        ],
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState,
        services,
      });

      expect(searchSource.getField('index')).toBe(dataViewMock);
      expect(searchSource.getField('query')).toEqual(appState.query);
      expect(searchSource.getField('filter')).toHaveLength(2);
    });

    it('should handle multiple filters from both states', () => {
      const appState: DiscoverAppState = {
        filters: [
          {
            meta: { index: 'test-index', alias: 'app-filter-1' },
            query: { match_all: {} },
          },
          {
            meta: { index: 'test-index', alias: 'app-filter-2' },
            query: { match_all: {} },
          },
        ],
      };

      const globalState: TabStateGlobalState = {
        filters: [
          {
            meta: { index: 'test-index', alias: 'global-filter-1' },
            query: { match_all: {} },
          },
          {
            meta: { index: 'test-index', alias: 'global-filter-2' },
            query: { match_all: {} },
          },
        ],
      };

      const searchSource = createSearchSource({
        dataView: dataViewMock,
        appState,
        globalState,
        services,
      });

      const filters = searchSource.getField('filter') as Filter[];
      expect(filters).toHaveLength(4);
      // Global filters come first
      expect(filters[0].meta.alias).toBe('global-filter-1');
      expect(filters[1].meta.alias).toBe('global-filter-2');
      // App filters come second
      expect(filters[2].meta.alias).toBe('app-filter-1');
      expect(filters[3].meta.alias).toBe('app-filter-2');
    });
  });
});
