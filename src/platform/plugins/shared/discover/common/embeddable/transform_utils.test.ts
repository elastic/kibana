/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import {
  byReferenceDiscoverSessionToSavedSearchEmbeddableState,
  byReferenceSavedSearchToDiscoverSessionEmbeddableState,
  byValueDiscoverSessionToSavedSearchEmbeddableState,
  byValueSavedSearchToDiscoverSessionEmbeddableState,
  discoverSessionToSavedSearchEmbeddableState,
  fromStoredColumns,
  fromStoredDataset,
  fromStoredHeight,
  fromStoredRuntimeFields,
  fromStoredSort,
  fromStoredTab,
  isByReferenceDiscoverSessionEmbeddableState,
  isByReferenceSavedSearchEmbeddableState,
  savedSearchToDiscoverSessionEmbeddableState,
  toStoredColumns,
  toStoredDataset,
  toStoredFieldFormats,
  toStoredGrid,
  toStoredHeight,
  toStoredRuntimeFields,
  toStoredSort,
  toStoredTab,
} from './transform_utils';
import type {
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableByValueState,
} from './types';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './constants';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
} from '../../server';
import { DataGridDensity } from '@kbn/discover-utils';
import type {
  DiscoverSessionDataViewReference,
  DiscoverSessionDataViewSpec,
} from '../../server/embeddable';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { ASCODE_FILTER_OPERATOR, ASCODE_FILTER_TYPE } from '@kbn/as-code-filters-constants';

describe('search embeddable transform utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isByReferenceSavedSearchEmbeddableState', () => {
    it('returns true when state has no attributes (by-reference)', () => {
      const state: StoredSearchEmbeddableByReferenceState = {
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
      };
      expect(isByReferenceSavedSearchEmbeddableState(state)).toBe(true);
    });

    it('returns false when state has attributes (by-value)', () => {
      const state = {
        title: 'My Search',
        description: 'My description',
        attributes: {
          tabs: [],
          title: '',
          description: '',
          sort: [],
          columns: [],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        },
      } as unknown as StoredSearchEmbeddableByValueState;
      expect(isByReferenceSavedSearchEmbeddableState(state)).toBe(false);
    });
  });

  describe('isByReferenceDiscoverSessionEmbeddableState', () => {
    it('returns true when state has discover_session_id', () => {
      const state: DiscoverSessionEmbeddableByReferenceState = {
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
        discover_session_id: 'session-123',
        selected_tab_id: undefined,
      };
      expect(isByReferenceDiscoverSessionEmbeddableState(state)).toBe(true);
    });

    it('returns false when state has tabs (by-value)', () => {
      const state: DiscoverSessionEmbeddableByValueState = {
        title: 'My Search',
        description: 'My description',
        tabs: [
          {
            columns: [{ name: 'message' }],
            sort: [],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            density: DataGridDensity.COMPACT,
            header_row_height: 'auto',
            row_height: 'auto',
            query: { language: 'kuery', query: '' },
            filters: [],
            dataset: { type: 'dataView', id: 'dv-1' },
          },
        ],
      };
      expect(isByReferenceDiscoverSessionEmbeddableState(state)).toBe(false);
    });
  });

  describe('savedSearchToDiscoverSessionEmbeddableState', () => {
    it('dispatches to by-reference transform when state has no attributes', () => {
      const storedState: StoredSearchEmbeddableByReferenceState = {
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
      };
      const references: SavedObjectReference[] = [
        { name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME, type: SavedSearchType, id: 'session-123' },
      ];
      const result = savedSearchToDiscoverSessionEmbeddableState(storedState, references);
      expect(result).toMatchObject({
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
        discover_session_id: 'session-123',
        selected_tab_id: undefined,
      });
    });

    it('dispatches to by-value transform when state has attributes', () => {
      const storedState = {
        title: 'My Search',
        description: 'My description',
        attributes: {
          title: '',
          sort: [['@timestamp', 'desc']],
          columns: ['message'],
          grid: {},
          hideChart: false,
          viewMode: VIEW_MODE.DOCUMENT_LEVEL,
          isTextBasedQuery: false,
          timeRestore: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"language":"kuery","query":""},"index":"dv-1","filter":[]}',
          },
          tabs: [
            {
              id: 'tab-1',
              label: 'Tab 1',
              attributes: {
                sort: [['@timestamp', 'desc']],
                columns: ['message'],
                grid: {},
                hideChart: false,
                viewMode: VIEW_MODE.DOCUMENT_LEVEL,
                isTextBasedQuery: false,
                timeRestore: false,
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"query":{"language":"kuery","query":""},"index":"dv-1","filter":[]}',
                },
              },
            },
          ],
        },
      } as StoredSearchEmbeddableByValueState;
      const references: SavedObjectReference[] = [
        { name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: 'dv-1' },
      ];
      const result = savedSearchToDiscoverSessionEmbeddableState(storedState, references);
      expect('tabs' in result && result.tabs).toBeDefined();
      expect('tabs' in result && Array.isArray(result.tabs)).toBe(true);
      expect('tabs' in result && result.tabs.length).toBe(1);
    });
  });

  describe('discoverSessionToSavedSearchEmbeddableState', () => {
    it('dispatches to by-reference transform when state has discover_session_id', () => {
      const apiState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
        discover_session_id: 'session-456',
        selected_tab_id: undefined,
      };
      const { state, references } = discoverSessionToSavedSearchEmbeddableState(apiState);
      expect(references).toContainEqual({
        name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
        type: SavedSearchType,
        id: 'session-456',
      });
      expect(state).toMatchObject({
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
      });
    });

    it('dispatches to by-value transform when state has tabs', () => {
      const apiState: DiscoverSessionEmbeddableByValueState = {
        title: 'Panel Title',
        description: 'Panel description',
        tabs: [
          {
            columns: [{ name: 'message' }],
            sort: [],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            density: DataGridDensity.COMPACT,
            header_row_height: 'auto',
            row_height: 'auto',
            query: { language: 'kuery', query: '' },
            filters: [],
            dataset: { type: 'dataView', id: 'data-view-1' },
          },
        ],
      };
      const { state, references } = discoverSessionToSavedSearchEmbeddableState(apiState);
      expect(state).toHaveProperty('attributes');
      expect((state as StoredSearchEmbeddableByValueState).attributes.tabs).toHaveLength(1);
      expect(references).toContainEqual({
        id: 'data-view-1',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      });
    });
  });

  describe('byValueSavedSearchToDiscoverSessionEmbeddableState', () => {
    it('converts to DiscoverSessionEmbeddableByValueState', () => {
      const storedState: StoredSearchEmbeddableByValueState = {
        title: '[filebeat-*] elasticsearch logs',
        description: 'my description',
        // type: 'search',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"language":"kuery","query":"service.type: \\"elasticsearch\\""},"highlightAll":true,"fields":[{"field":"*","include_unmapped":true}],"sort":[{"@timestamp":{"order":"desc","format":"strict_date_optional_time"}},{"_doc":"desc"}],"filter":[{"meta":{"disabled":false,"negate":false,"alias":null,"key":"service.type","field":"service.type","params":{"query":"elasticsearch"},"type":"phrase","index":"c7d7a1f5-19da-4ba9-af15-5919e8cd2528"},"query":{"match_phrase":{"service.type":"elasticsearch"}},"$state":{"store":"appState"}}],"index":"c7d7a1f5-19da-4ba9-af15-5919e8cd2528"}',
          },
          title: '',
          sort: [['@timestamp', 'desc']],
          columns: ['message'],
          description: '',
          grid: {},
          hideChart: false,
          viewMode: VIEW_MODE.DOCUMENT_LEVEL,
          isTextBasedQuery: false,
          timeRestore: false,
          tabs: [
            {
              id: 'e0ae3a4e-67b9-4383-a8c1-ce463000b4bd',
              label: 'Untitled',
              attributes: {
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"query":{"language":"kuery","query":"service.type: \\"elasticsearch\\""},"highlightAll":true,"fields":[{"field":"*","include_unmapped":true}],"sort":[{"@timestamp":{"order":"desc","format":"strict_date_optional_time"}},{"_doc":"desc"}],"filter":[{"meta":{"disabled":false,"negate":false,"alias":null,"key":"service.type","field":"service.type","params":{"query":"elasticsearch"},"type":"phrase","index":"c7d7a1f5-19da-4ba9-af15-5919e8cd2528"},"query":{"match_phrase":{"service.type":"elasticsearch"}},"$state":{"store":"appState"}}],"index":"c7d7a1f5-19da-4ba9-af15-5919e8cd2528"}',
                },
                sort: [['@timestamp', 'desc']],
                columns: ['message'],
                grid: {},
                hideChart: false,
                viewMode: VIEW_MODE.DOCUMENT_LEVEL,
                isTextBasedQuery: false,
                timeRestore: false,
              },
            },
          ],
        },
      };

      const expected: DiscoverSessionEmbeddableByValueState = {
        title: '[filebeat-*] elasticsearch logs',
        description: 'my description',
        tabs: [
          {
            query: { language: 'kuery', query: 'service.type: "elasticsearch"' },
            filters: [
              {
                type: ASCODE_FILTER_TYPE.CONDITION,
                condition: {
                  field: 'service.type',
                  operator: ASCODE_FILTER_OPERATOR.IS,
                  value: 'elasticsearch',
                },
                data_view_id: 'c7d7a1f5-19da-4ba9-af15-5919e8cd2528',
                disabled: false,
                negate: false,
              },
            ],
            sort: [{ name: '@timestamp', direction: 'desc' }],
            columns: [{ name: 'message' }],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            density: DataGridDensity.COMPACT,
            header_row_height: 3,
            dataset: {
              type: 'dataView',
              id: 'c7d7a1f5-19da-4ba9-af15-5919e8cd2528',
            },
          },
        ],
      };

      const result = byValueSavedSearchToDiscoverSessionEmbeddableState(storedState);

      expect(result).toEqual(expected);
    });
  });

  describe('byReferenceSavedSearchToDiscoverSessionEmbeddableState', () => {
    it('converts stored by-reference state to discover session embeddable state with references', () => {
      const storedSearch: StoredSearchEmbeddableByReferenceState = {
        title: 'My Saved Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
      };
      const references: SavedObjectReference[] = [
        { name: 'savedObjectRef', type: SavedSearchType, id: 'session-123' },
      ];
      const result = byReferenceSavedSearchToDiscoverSessionEmbeddableState(
        storedSearch,
        references
      );
      expect(result).toEqual({
        title: 'My Saved Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
        discover_session_id: 'session-123',
        selected_tab_id: undefined,
      });
    });
  });

  describe('byReferenceDiscoverSessionToSavedSearchEmbeddableState', () => {
    it('converts discover session by-reference state to stored state with references', () => {
      const apiState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
        discover_session_id: 'session-456',
        selected_tab_id: 'tab-1',
      };
      const result = byReferenceDiscoverSessionToSavedSearchEmbeddableState(apiState);
      expect(result.references).toEqual([
        {
          name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
          type: SavedSearchType,
          id: 'session-456',
        },
      ]);
      expect(result.state).toEqual({
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
        grid: { columns: {} },
      });
    });
  });

  describe('byValueDiscoverSessionToSavedSearchEmbeddableState', () => {
    it('converts discover session by-value state to stored state with references', () => {
      const apiState: DiscoverSessionEmbeddableByValueState = {
        title: 'Panel Title',
        description: 'Panel description',
        time_range: { from: 'now-1h', to: 'now' },
        tabs: [
          {
            columns: [{ name: 'message' }, { name: '@timestamp', width: 200 }],
            sort: [{ name: '@timestamp', direction: 'desc' }],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            density: DataGridDensity.COMPACT,
            header_row_height: 'auto',
            row_height: 'auto',
            query: { language: 'kuery', query: '' },
            filters: [],
            rows_per_page: 100,
            sample_size: 1000,
            dataset: { type: 'dataView', id: 'data-view-1' },
          },
        ],
      };
      const result = byValueDiscoverSessionToSavedSearchEmbeddableState(apiState);
      expect(result.references).toEqual([
        {
          id: 'data-view-1',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        },
      ]);
      expect(result.state.title).toBe('Panel Title');
      expect(result.state.description).toBe('Panel description');
      expect(result.state.attributes.tabs).toHaveLength(1);
      expect(result.state.attributes.tabs[0].attributes.columns).toEqual(['message', '@timestamp']);
      expect(result.state.attributes.tabs[0].attributes.sort).toEqual([['@timestamp', 'desc']]);
      expect(result.state.attributes.tabs[0].attributes.rowHeight).toBe(-1);
      expect(result.state.attributes.tabs[0].attributes.headerRowHeight).toBe(-1);
      const searchSource = JSON.parse(
        result.state.attributes.tabs[0].attributes.kibanaSavedObjectMeta.searchSourceJSON
      );
      expect(searchSource.indexRefName).toBe('kibanaSavedObjectMeta.searchSourceJSON.index');
      expect(searchSource.index).toBeUndefined();
      expect(searchSource.query).toEqual({ language: 'kuery', query: '' });
      expect(searchSource.filter).toEqual([]);
    });

    it('converts index-pattern tab with runtime fields to stored state', () => {
      const apiState: DiscoverSessionEmbeddableByValueState = {
        title: 'Adhoc',
        time_range: { from: 'now-1h', to: 'now' },
        tabs: [
          {
            columns: [{ name: 'foo' }],
            sort: [],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            density: DataGridDensity.COMPACT,
            header_row_height: 50,
            row_height: 30,
            query: { language: 'kuery', query: '' },
            filters: [],
            rows_per_page: 25,
            sample_size: 500,
            dataset: {
              type: 'index',
              index: 'my-*',
              time_field: '@timestamp',
              runtime_fields: [
                {
                  name: 'rt',
                  type: 'keyword',
                  script: 'emit("x")',
                  format: { id: 'string' },
                },
              ],
            },
          },
        ],
      };
      const result = byValueDiscoverSessionToSavedSearchEmbeddableState(apiState);
      const searchSource = JSON.parse(
        result.state.attributes.tabs[0].attributes.kibanaSavedObjectMeta.searchSourceJSON
      );
      expect(searchSource.index).toEqual({
        title: 'my-*',
        timeFieldName: '@timestamp',
        fieldFormats: {
          rt: { id: 'string' },
        },
        runtimeFieldMap: {
          rt: {
            type: 'keyword',
            script: { source: 'emit("x")' },
          },
        },
      });
    });
  });

  describe('fromStoredColumns', () => {
    it('maps column names to column objects without width when grid has no column widths', () => {
      const columns = ['message', '@timestamp'];
      const grid = { columns: {} };
      const result = fromStoredColumns(columns, grid);
      expect(result).toEqual([{ name: 'message' }, { name: '@timestamp' }]);
    });

    it('includes width from grid when present', () => {
      const columns = ['message', '@timestamp'];
      const grid = {
        columns: {
          message: { width: 100 },
          '@timestamp': { width: 200 },
        },
      };
      const result = fromStoredColumns(columns, grid);
      expect(result).toEqual([
        { name: 'message', width: 100 },
        { name: '@timestamp', width: 200 },
      ]);
    });

    it('includes width only for columns that have it in grid', () => {
      const columns = ['message', '@timestamp', 'source'];
      const grid = {
        columns: {
          '@timestamp': { width: 150 },
        },
      };
      const result = fromStoredColumns(columns, grid);
      expect(result).toEqual([
        { name: 'message' },
        { name: '@timestamp', width: 150 },
        { name: 'source' },
      ]);
    });
  });

  describe('toStoredColumns', () => {
    it('maps column objects to column names', () => {
      const columns = [{ name: 'message' }, { name: '@timestamp', width: 200 }];
      const result = toStoredColumns(columns);
      expect(result).toEqual(['message', '@timestamp']);
    });

    it('returns empty array when columns is empty', () => {
      expect(toStoredColumns([])).toEqual([]);
    });

    it('returns empty array when columns is undefined (default)', () => {
      expect(toStoredColumns()).toEqual([]);
    });
  });

  describe('toStoredGrid', () => {
    it('builds grid from columns (only columns with width are included)', () => {
      const columns = [{ name: 'message' }, { name: '@timestamp', width: 200 }];
      const result = toStoredGrid(columns);
      expect(result).toEqual({
        columns: {
          '@timestamp': { width: 200 },
        },
      });
    });

    it('returns empty columns object when columns is empty', () => {
      expect(toStoredGrid([])).toEqual({ columns: {} });
    });

    it('returns empty columns object when columns is undefined (default)', () => {
      expect(toStoredGrid()).toEqual({ columns: {} });
    });
  });

  describe('fromStoredSort', () => {
    it('converts array of [field, direction] to sort objects', () => {
      const sort = [
        ['@timestamp', 'desc'],
        ['message', 'asc'],
      ];
      const result = fromStoredSort(sort);
      expect(result).toEqual([
        { name: '@timestamp', direction: 'desc' },
        { name: 'message', direction: 'asc' },
      ]);
    });

    it('defaults direction to desc when not asc or desc', () => {
      const sort = [['field', 'other' as 'desc']];
      const result = fromStoredSort(sort);
      expect(result).toEqual([{ name: 'field', direction: 'desc' }]);
    });
  });

  describe('toStoredSort', () => {
    it('converts sort objects to array of [name, direction]', () => {
      const sort = [
        { name: '@timestamp', direction: 'desc' as const },
        { name: 'message', direction: 'asc' as const },
      ];
      const result = toStoredSort(sort);
      expect(result).toEqual([
        ['@timestamp', 'desc'],
        ['message', 'asc'],
      ]);
    });

    it('returns empty array when sort is undefined (default)', () => {
      expect(toStoredSort()).toEqual([]);
    });

    it('returns empty array when sort is empty', () => {
      expect(toStoredSort([])).toEqual([]);
    });
  });

  describe('fromStoredHeight', () => {
    it('returns numeric height as-is', () => {
      expect(fromStoredHeight(3)).toBe(3);
      expect(fromStoredHeight(5)).toBe(5);
    });

    it('returns "auto" when height is -1', () => {
      expect(fromStoredHeight(-1)).toBe('auto');
    });

    it('defaults to 3 when height is undefined', () => {
      expect(fromStoredHeight(undefined as unknown as number)).toBe(3);
    });
  });

  describe('toStoredHeight', () => {
    it('returns numeric height as-is', () => {
      expect(toStoredHeight(3)).toBe(3);
      expect(toStoredHeight(5)).toBe(5);
    });

    it('returns -1 when height is "auto"', () => {
      expect(toStoredHeight('auto')).toBe(-1);
    });
  });

  describe('fromStoredDataset', () => {
    it('throws when index is null', () => {
      expect(() => fromStoredDataset(null as unknown as string)).toThrow(
        'Data view is required to convert from stored dataset'
      );
    });

    it('returns dataView reference when index is a string id', () => {
      const result = fromStoredDataset('my-data-view-id');
      expect(result).toEqual({ type: 'dataView', id: 'my-data-view-id' });
    });

    it('throws when index object has no title or id', () => {
      expect(() => fromStoredDataset({ timeFieldName: '@timestamp' } as unknown as string)).toThrow(
        'Stored index object must have a title or id to convert to dataset'
      );
    });

    it('transforms index-pattern object to DiscoverSessionDataViewSpec', () => {
      const index: DataViewSpec = {
        id: 'eaa3802b-a071-49c0-8442-1fcd2cdcc9fa',
        title: 'f*',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        fieldFormats: {
          foobar: {
            id: 'url',
            params: {
              parsedUrl: {
                origin: 'http://localhost:5601',
                pathname: '/app/dashboards',
                basePath: '',
              },
              type: 'a',
              urlTemplate: 'http://google.com?q={{value}}',
              labelTemplate: 'google search for {{value}}',
              width: null,
              height: null,
            },
          },
        },
        runtimeFieldMap: {
          foobar: {
            type: 'keyword',
            script: {
              source: 'emit(UUID.randomUUID().toString())',
            },
          },
        },
        fieldAttrs: {
          foobar: {
            customLabel: 'my custom label',
            customDescription: 'my custom description',
          },
        },
        allowNoIndex: false,
        name: 'f*',
        allowHidden: false,
        managed: false,
      };
      const expected: DiscoverSessionDataViewSpec = {
        type: 'index',
        index: 'f*',
        time_field: '@timestamp',
        runtime_fields: [
          {
            type: 'keyword',
            name: 'foobar',
            script: 'emit(UUID.randomUUID().toString())',
            format: {
              id: 'url',
              params: {
                parsedUrl: {
                  origin: 'http://localhost:5601',
                  pathname: '/app/dashboards',
                  basePath: '',
                },
                type: 'a',
                urlTemplate: 'http://google.com?q={{value}}',
                labelTemplate: 'google search for {{value}}',
                width: null,
                height: null,
              },
            },
          },
        ],
      };
      const result = fromStoredDataset(index);
      expect(result).toEqual(expected);
    });
  });

  describe('fromStoredRuntimeFields', () => {
    it('transforms runtime fields with field formats', () => {
      const runtimeFieldMap: DataViewSpec['runtimeFieldMap'] = {
        foobar: {
          type: 'keyword',
          script: {
            source: 'emit(UUID.randomUUID().toString())',
          },
        },
      };
      const fieldFormats: DataViewSpec['fieldFormats'] = {
        foobar: {
          id: 'url',
          params: {
            parsedUrl: {
              origin: 'http://localhost:5601',
              pathname: '/app/dashboards',
              basePath: '',
            },
            type: 'a',
            urlTemplate: 'http://google.com?q={{value}}',
            labelTemplate: 'google search for {{value}}',
            width: null,
            height: null,
          },
        },
      };
      const expected: DiscoverSessionDataViewSpec['runtime_fields'] = [
        {
          type: 'keyword',
          name: 'foobar',
          script: 'emit(UUID.randomUUID().toString())',
          format: {
            id: 'url',
            params: {
              parsedUrl: {
                origin: 'http://localhost:5601',
                pathname: '/app/dashboards',
                basePath: '',
              },
              type: 'a',
              urlTemplate: 'http://google.com?q={{value}}',
              labelTemplate: 'google search for {{value}}',
              width: null,
              height: null,
            },
          },
        },
      ];
      const result = fromStoredRuntimeFields(runtimeFieldMap, fieldFormats);
      expect(result).toEqual(expected);
    });
  });

  describe('toStoredDataset', () => {
    it('converts dataView dataset to string id', () => {
      const dataset: DiscoverSessionDataViewReference = {
        type: 'dataView',
        id: 'my-data-view-id',
      };
      const result = toStoredDataset(dataset);
      expect(result).toBe('my-data-view-id');
    });

    it('converts index-pattern dataset to serialized index spec', () => {
      const dataset: DiscoverSessionDataViewSpec = {
        type: 'index',
        index: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [
          {
            name: 'rt',
            type: 'keyword',
            script: 'emit(doc["id"].value)',
            format: { id: 'string' },
          },
        ],
      };
      const result = toStoredDataset(dataset);
      expect(result).toEqual({
        title: 'my-index-*',
        timeFieldName: '@timestamp',
        fieldFormats: {
          rt: { id: 'string' },
        },
        runtimeFieldMap: {
          rt: {
            type: 'keyword',
            script: { source: 'emit(doc["id"].value)' },
          },
        },
      });
    });

    it('converts index-pattern dataset without runtime fields', () => {
      const dataset: DiscoverSessionDataViewSpec = {
        type: 'index',
        index: 'logs-*',
        time_field: '@timestamp',
      };
      const result = toStoredDataset(dataset);
      expect(result).toEqual({
        title: 'logs-*',
        timeFieldName: '@timestamp',
      });
    });
  });

  describe('toStoredRuntimeFields', () => {
    it('converts runtime fields to DataViewSpec runtimeFieldMap', () => {
      const runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = [
        {
          name: 'myField',
          type: 'keyword',
          script: 'emit("hello")',
          format: { id: 'url', params: {} },
        },
      ];
      const result = toStoredRuntimeFields(runtimeFields);
      expect(result).toEqual({
        myField: {
          type: 'keyword',
          script: { source: 'emit("hello")' },
        },
      });
    });

    it('omits script when not present', () => {
      const runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = [
        { name: 'f', type: 'long' },
      ];
      const result = toStoredRuntimeFields(runtimeFields);
      expect(result).toEqual({
        f: { type: 'long' },
      });
    });

    it('omits fieldFormat when not present', () => {
      const runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = [
        { name: 'f', type: 'keyword', script: 'emit("x")' },
      ];
      const result = toStoredRuntimeFields(runtimeFields);
      expect(result).toEqual({
        f: { type: 'keyword', script: { source: 'emit("x")' } },
      });
    });

    it('returns empty object when runtimeFields is undefined (default)', () => {
      expect(toStoredRuntimeFields()).toEqual({});
    });

    it('returns empty object when runtimeFields is empty array', () => {
      expect(toStoredRuntimeFields([])).toEqual({});
    });
  });

  describe('toStoredFieldFormats', () => {
    it('converts runtime fields with format to fieldFormats object', () => {
      const runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = [
        {
          name: 'rt',
          type: 'keyword',
          script: 'emit("x")',
          format: { id: 'string' },
        },
      ];
      const result = toStoredFieldFormats(runtimeFields);
      expect(result).toEqual({
        rt: { id: 'string' },
      });
    });

    it('omits entries when format is missing', () => {
      const runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = [
        { name: 'rt', type: 'keyword', script: 'emit("x")' },
      ];
      const result = toStoredFieldFormats(runtimeFields);
      expect(result).toEqual({});
    });

    it('returns undefined when runtimeFields is undefined (default)', () => {
      expect(toStoredFieldFormats()).toBeUndefined();
    });

    it('returns undefined when runtimeFields is empty array', () => {
      expect(toStoredFieldFormats([])).toBeUndefined();
    });

    it('includes only runtime fields that have format', () => {
      const runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = [
        { name: 'a', type: 'keyword', format: { id: 'url' } },
        { name: 'b', type: 'long' },
        { name: 'c', type: 'date', format: { id: 'date' } },
      ];
      const result = toStoredFieldFormats(runtimeFields);
      expect(result).toEqual({
        a: { id: 'url' },
        c: { id: 'date' },
      });
    });
  });

  describe('fromStoredTab', () => {
    it('converts stored tab with dataView id to API tab', () => {
      const storedTab = {
        sort: [['@timestamp', 'desc']],
        columns: ['message', '@timestamp'],
        grid: { columns: { '@timestamp': { width: 200 } } },
        rowHeight: -1,
        headerRowHeight: -1,
        sampleSize: 500,
        rowsPerPage: 100,
        density: DataGridDensity.COMPACT,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        hideChart: false,
        isTextBasedQuery: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            query: { language: 'kuery', query: '' },
            index: 'data-view-1',
            filter: [],
          }),
        },
      };
      const references: SavedObjectReference[] = [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'data-view-1',
        },
      ];
      const result = fromStoredTab(
        storedTab as unknown as Parameters<typeof fromStoredTab>[0],
        references
      );
      expect(result.sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
      expect(result.columns).toEqual([
        { name: 'message' },
        { name: '@timestamp', width: 200 },
      ]);
      expect(result.row_height).toBe('auto');
      expect(result.header_row_height).toBe('auto');
      expect(result.density).toBe(DataGridDensity.COMPACT);
      expect('dataset' in result && result.dataset).toEqual({
        type: 'dataView',
        id: 'data-view-1',
      });
      expect('view_mode' in result && result.view_mode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
    });
  });

  describe('toStoredTab', () => {
    it('converts API classic tab to stored tab with references', () => {
      const apiTab: DiscoverSessionEmbeddableByValueState['tabs'][0] = {
        columns: [{ name: 'message' }, { name: '@timestamp', width: 200 }],
        sort: [{ name: '@timestamp', direction: 'desc' }],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        density: DataGridDensity.COMPACT,
        header_row_height: 'auto',
        row_height: 'auto',
        query: { language: 'kuery', query: '' },
        filters: [],
        rows_per_page: 100,
        sample_size: 500,
        dataset: { type: 'dataView', id: 'data-view-1' },
      };
      const { state, references } = toStoredTab(apiTab);
      expect(references).toContainEqual({
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: 'data-view-1',
      });
      expect(state.sort).toEqual([['@timestamp', 'desc']]);
      expect(state.columns).toEqual(['message', '@timestamp']);
      expect(state.rowHeight).toBe(-1);
      expect(state.headerRowHeight).toBe(-1);
      expect(state.density).toBe(DataGridDensity.COMPACT);
      expect(state.hideChart).toBe(false);
      expect(state.isTextBasedQuery).toBe(false);
      const searchSource = JSON.parse(state.kibanaSavedObjectMeta.searchSourceJSON);
      expect(searchSource.indexRefName).toBe('kibanaSavedObjectMeta.searchSourceJSON.index');
      expect(searchSource.index).toBeUndefined();
      expect(searchSource.query).toEqual({ language: 'kuery', query: '' });
      expect(searchSource.filter).toEqual([]);
    });

    it('converts API tab with index-pattern dataset (no refs) when inline', () => {
      const apiTab: DiscoverSessionEmbeddableByValueState['tabs'][0] = {
        columns: [{ name: 'foo' }],
        sort: [],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        density: DataGridDensity.COMPACT,
        header_row_height: 3,
        row_height: 3,
        query: { language: 'kuery', query: '' },
        filters: [],
        dataset: {
          type: 'index',
          index: 'my-*',
          time_field: '@timestamp',
        },
      };
      const { state, references } = toStoredTab(apiTab);
      expect(references).toEqual([]);
      const searchSource = JSON.parse(state.kibanaSavedObjectMeta.searchSourceJSON);
      expect(searchSource.index).toEqual({
        title: 'my-*',
        timeFieldName: '@timestamp',
      });
    });
  });
});
