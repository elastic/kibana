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
  fromStoredColumns,
  fromStoredDataset,
  fromStoredRuntimeFields,
  fromStoredSort,
  toStoredColumns,
  toStoredDataset,
  toStoredGrid,
  toStoredRuntimeFields,
  toStoredSort,
} from './transform_utils';
import type {
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableByValueState,
} from './types';
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
        // type: 'search',
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
            header_row_height: 'auto',
            row_height: 'auto',
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
          name: 'savedObjectRef',
          type: SavedSearchType,
          id: 'session-456',
        },
      ]);
      expect(result.state).toEqual({
        title: 'My Search',
        description: 'My description',
        time_range: { from: 'now-15m', to: 'now' },
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
      expect(result.state.attributes.tabs[0].attributes.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
      expect(result.state.attributes.tabs[0].attributes.rowHeight).toBe(-1);
      expect(result.state.attributes.tabs[0].attributes.headerRowHeight).toBe(-1);
      expect(
        JSON.parse(
          result.state.attributes.tabs[0].attributes.kibanaSavedObjectMeta.searchSourceJSON
        )
      ).toEqual({
        index: 'data-view-1',
        query: { language: 'kuery', query: '' },
        filter: [],
      });
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
});
