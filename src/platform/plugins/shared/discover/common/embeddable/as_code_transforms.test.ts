/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { getSearchEmbeddableAsCodeTransforms } from './as_code_transforms';
import type { StoredSearchEmbeddableState } from './types';

const mockDrilldownTransforms = {
  transformIn: jest.fn().mockImplementation((state: unknown) => ({
    state,
    references: [],
  })),
  transformOut: jest.fn().mockImplementation((state: StoredSearchEmbeddableState) => state),
} as unknown as DrilldownTransforms;

describe('as-code search embeddable transforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transformIn', () => {
    describe('by-reference state', () => {
      it('converts discover_session_id to a saved object reference', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          discover_session_id: 'test-session-id',
          title: 'My Session',
        });

        expect(result.references).toContainEqual({
          name: 'savedObjectRef',
          type: 'search',
          id: 'test-session-id',
        });
        expect(result.state).not.toHaveProperty('discover_session_id');
        expect(result.state).toHaveProperty('title', 'My Session');
      });

      it('converts selected_tab_id to selectedTabId', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          discover_session_id: 'test-session-id',
          selected_tab_id: 'tab-1',
        });

        expect(result.state).toHaveProperty('selectedTabId', 'tab-1');
      });
    });

    describe('by-value state', () => {
      it('converts a classic tab with filters to stored format', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          title: 'My Session',
          description: 'Test description',
          tabs: [
            {
              columns: [{ name: 'field1', width: 200 }, { name: 'field2' }],
              sort: [{ name: '@timestamp', direction: 'desc' as const }],
              view_mode: 'documents',
              density: 'compact',
              row_height: 3,
              rows_per_page: 100,
              sample_size: 500,
              query: { language: 'kuery', query: 'field1: value' },
              filters: [
                {
                  type: 'condition',
                  data_view_id: 'test-data-view',
                  condition: { field: 'status', operator: 'is', value: 'active' },
                },
              ],
              dataset: { type: 'dataView', id: 'test-data-view' },
            },
          ],
        });

        const attrs = result.state as Record<string, unknown>;
        const attributes = attrs.attributes as Record<string, unknown>;
        expect(attributes.title).toBe('My Session');

        const tabs = attributes.tabs as Array<Record<string, unknown>>;
        expect(tabs).toHaveLength(1);

        const tab = tabs[0];
        expect(tab.id).toBeDefined();
        expect(tab.label).toBe('My Session');

        const tabAttrs = tab.attributes as Record<string, unknown>;
        expect(tabAttrs.columns).toEqual(['field1', 'field2']);
        expect(tabAttrs.sort).toEqual([['@timestamp', 'desc']]);
        expect(tabAttrs.grid).toEqual({ columns: { field1: { width: 200 } } });
        expect(tabAttrs.viewMode).toBe('documents');
        expect(tabAttrs.density).toBe('compact');
        expect(tabAttrs.rowHeight).toBe(3);
        expect(tabAttrs.rowsPerPage).toBe(100);
        expect(tabAttrs.sampleSize).toBe(500);
        expect(tabAttrs.isTextBasedQuery).toBe(false);

        const meta = tabAttrs.kibanaSavedObjectMeta as Record<string, string>;
        const searchSource = JSON.parse(meta.searchSourceJSON);
        expect(searchSource.query).toEqual({ language: 'kuery', query: 'field1: value' });
        expect(searchSource.filter).toBeDefined();
      });

      it('converts an ES|QL tab to stored format', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          title: 'ESQL Session',
          tabs: [
            {
              query: { esql: 'FROM logs-* | LIMIT 10' },
              columns: [{ name: 'message' }],
              sort: [{ name: '@timestamp', direction: 'desc' as const }],
            },
          ],
        });

        const attributes = (result.state as Record<string, unknown>).attributes as Record<
          string,
          unknown
        >;
        const tabs = attributes.tabs as Array<Record<string, unknown>>;
        const tabAttrs = tabs[0].attributes as Record<string, unknown>;
        expect(tabAttrs.isTextBasedQuery).toBe(true);
        expect(tabAttrs.columns).toEqual(['message']);
        expect(tabAttrs.sort).toEqual([['@timestamp', 'desc']]);
      });

      it('handles empty filters gracefully', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          title: 'No Filters Session',
          tabs: [
            {
              filters: [],
              dataset: { type: 'dataView', id: 'test-data-view' },
            },
          ],
        });

        const attributes = (result.state as Record<string, unknown>).attributes as Record<
          string,
          unknown
        >;
        const tabs = attributes.tabs as Array<Record<string, unknown>>;
        const tabAttrs = tabs[0].attributes as Record<string, unknown>;
        const meta = tabAttrs.kibanaSavedObjectMeta as Record<string, string>;
        const searchSource = JSON.parse(meta.searchSourceJSON);
        expect(searchSource.filter).toBeUndefined();
      });

      it('converts group filters correctly', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          title: 'Group Filter Session',
          tabs: [
            {
              filters: [
                {
                  type: 'group',
                  data_view_id: 'test-data-view',
                  group: {
                    operator: 'and',
                    conditions: [
                      { field: 'status', operator: 'is', value: 'active' },
                      { field: 'level', operator: 'is', value: 'error' },
                    ],
                  },
                },
              ],
              dataset: { type: 'dataView', id: 'test-data-view' },
            },
          ],
        });

        const attributes = (result.state as Record<string, unknown>).attributes as Record<
          string,
          unknown
        >;
        const tabs = attributes.tabs as Array<Record<string, unknown>>;
        const tabAttrs = tabs[0].attributes as Record<string, unknown>;
        const meta = tabAttrs.kibanaSavedObjectMeta as Record<string, string>;
        const searchSource = JSON.parse(meta.searchSourceJSON);
        expect(searchSource.filter).toBeDefined();
        expect(searchSource.filter).toHaveLength(1);
        expect(searchSource.filter[0].meta.type).toBe('combined');
      });

      it('marks ad-hoc data views correctly', () => {
        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!({
          title: 'Ad-hoc DV Session',
          tabs: [
            {
              filters: [],
              dataset: { type: 'index', index: 'my-index-*', time_field: '@timestamp' },
            },
          ],
        });

        const attributes = (result.state as Record<string, unknown>).attributes as Record<
          string,
          unknown
        >;
        const tabs = attributes.tabs as Array<Record<string, unknown>>;
        const tabAttrs = tabs[0].attributes as Record<string, unknown>;
        expect(tabAttrs.usesAdHocDataView).toBe(true);
      });
    });
  });

  describe('transformOut', () => {
    it('converts a stored by-reference state to as-code format', () => {
      const storedState: StoredSearchEmbeddableState = {
        title: 'My Session',
        description: 'Test',
      };
      const references = [{ name: 'savedObjectRef', type: 'search', id: 'test-session-id' }];

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState, references) as Record<string, unknown>;

      expect(result).toHaveProperty('discover_session_id', 'test-session-id');
      expect(result).toHaveProperty('title', 'My Session');
    });

    it('converts a stored by-value state to as-code format with filters', () => {
      const storedFilter = {
        meta: {
          type: 'phrase',
          key: 'status',
          field: 'status',
          params: { query: 'active' },
          index: 'test-data-view',
          disabled: false,
          negate: false,
        },
        query: { match_phrase: { status: 'active' } },
      };

      const storedState = {
        title: 'My Session',
        attributes: {
          title: 'My Session',
          description: 'Test',
          columns: ['field1', 'field2'],
          sort: [['@timestamp', 'desc']],
          grid: { columns: { field1: { width: 200 } } },
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              query: { language: 'kuery', query: '' },
              filter: [storedFilter],
              indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            }),
          },
          tabs: [
            {
              id: 'tab-1',
              label: 'Tab 1',
              attributes: {
                columns: ['field1', 'field2'],
                sort: [['@timestamp', 'desc']],
                grid: { columns: { field1: { width: 200 } } },
                hideChart: false,
                isTextBasedQuery: false,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query: '' },
                    filter: [storedFilter],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  }),
                },
                viewMode: 'documents',
                density: 'compact',
                rowHeight: 3,
                rowsPerPage: 100,
                sampleSize: 500,
              },
            },
          ],
        },
      } as unknown as StoredSearchEmbeddableState;

      const references = [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'test-data-view',
        },
      ];

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState, references) as Record<string, unknown>;

      expect(result).toHaveProperty('tabs');
      const tabs = result.tabs as Array<Record<string, unknown>>;
      expect(tabs).toHaveLength(1);

      const tab = tabs[0];
      const filters = tab.filters as Array<Record<string, unknown>>;
      expect(filters).toHaveLength(1);
      expect(filters[0]).toHaveProperty('type', 'condition');

      const condition = (filters[0] as Record<string, Record<string, unknown>>).condition;
      expect(condition.field).toBe('status');
      expect(condition.operator).toBe('is');
      expect(condition.value).toBe('active');

      expect(tab.dataset).toEqual({ type: 'dataView', id: 'test-data-view' });
      expect(tab.columns).toEqual([{ name: 'field1', width: 200 }, { name: 'field2' }]);
      expect(tab.sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
      expect(tab.view_mode).toBe('documents');
      expect(tab.density).toBe('compact');
      expect(tab.row_height).toBe(3);
      expect(tab.rows_per_page).toBe(100);
      expect(tab.sample_size).toBe(500);
    });

    it('handles stored by-value state without tabs using extractTabs', () => {
      const storedState = {
        title: 'Old Format',
        attributes: {
          title: 'Old Format',
          description: '',
          columns: ['col1'],
          sort: [],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        },
      } as unknown as StoredSearchEmbeddableState;

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState) as Record<string, unknown>;

      expect(result).toHaveProperty('tabs');
      const tabs = result.tabs as unknown[];
      expect(tabs.length).toBeGreaterThanOrEqual(1);
    });

    it('converts range filters from stored to as-code format', () => {
      const storedFilter = {
        meta: {
          type: 'range',
          key: 'bytes',
          field: 'bytes',
          params: { gte: 1000, lte: 5000 },
          index: 'test-data-view',
        },
        query: { range: { bytes: { gte: 1000, lte: 5000 } } },
      };

      const storedState = {
        title: 'Range Filter Session',
        attributes: {
          title: 'Range Filter Session',
          description: '',
          columns: [],
          sort: [],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          tabs: [
            {
              id: 'tab-1',
              label: 'Tab 1',
              attributes: {
                columns: [],
                sort: [],
                grid: {},
                hideChart: false,
                isTextBasedQuery: false,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({ filter: [storedFilter] }),
                },
              },
            },
          ],
        },
      } as unknown as StoredSearchEmbeddableState;

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState) as Record<string, unknown>;
      const tabs = result.tabs as Array<Record<string, unknown>>;
      const filters = tabs[0].filters as Array<Record<string, unknown>>;

      expect(filters).toHaveLength(1);
      expect(filters[0]).toHaveProperty('type', 'condition');
      const condition = (filters[0] as Record<string, Record<string, unknown>>).condition;
      expect(condition.field).toBe('bytes');
      expect(condition.operator).toBe('range');
      expect(condition.value).toEqual({ gte: 1000, lte: 5000 });
    });

    it('converts an ES|QL stored tab to as-code format', () => {
      const storedState = {
        title: 'ESQL Session',
        attributes: {
          title: 'ESQL Session',
          description: '',
          columns: ['message'],
          sort: [],
          grid: {},
          hideChart: false,
          isTextBasedQuery: true,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          tabs: [
            {
              id: 'tab-1',
              label: 'Tab 1',
              attributes: {
                columns: ['message'],
                sort: [['@timestamp', 'desc']],
                grid: {},
                hideChart: false,
                isTextBasedQuery: true,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    query: { esql: 'FROM logs-* | LIMIT 10' },
                  }),
                },
                viewMode: 'documents',
              },
            },
          ],
        },
      } as unknown as StoredSearchEmbeddableState;

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState) as Record<string, unknown>;
      const tabs = result.tabs as Array<Record<string, unknown>>;

      expect(tabs).toHaveLength(1);
      expect(tabs[0].query).toEqual({ esql: 'FROM logs-* | LIMIT 10' });
      expect(tabs[0]).not.toHaveProperty('filters');
      expect(tabs[0]).not.toHaveProperty('dataset');
      expect(tabs[0].columns).toEqual([{ name: 'message' }]);
      expect(tabs[0].sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
      expect(tabs[0].view_mode).toBe('documents');
    });

    it('omits disabled filters from as-code output', () => {
      const disabledFilter = {
        $state: { store: 'appState' },
        meta: {
          type: 'phrase',
          key: 'status',
          field: 'status',
          params: { query: 'inactive' },
          index: 'test-data-view',
          disabled: true,
          negate: false,
        },
        query: { match_phrase: { status: 'inactive' } },
      };

      const storedState = {
        title: 'Disabled Filter Session',
        attributes: {
          title: 'Disabled Filter Session',
          description: '',
          columns: [],
          sort: [],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          tabs: [
            {
              id: 'tab-1',
              label: 'Tab 1',
              attributes: {
                columns: [],
                sort: [],
                grid: {},
                hideChart: false,
                isTextBasedQuery: false,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({ filter: [disabledFilter] }),
                },
              },
            },
          ],
        },
      } as unknown as StoredSearchEmbeddableState;

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState) as Record<string, unknown>;
      const tabs = result.tabs as Array<Record<string, unknown>>;
      const filters = tabs[0].filters as Array<Record<string, unknown>>;

      expect(filters).toHaveLength(1);
      expect(filters[0]).toHaveProperty('disabled', true);
    });
  });

  describe('round-trip conversion', () => {
    it('preserves simple condition filters through in→out→in', () => {
      const originalAsCode = {
        title: 'Round Trip Test',
        tabs: [
          {
            filters: [
              {
                type: 'condition',
                data_view_id: 'test-data-view',
                condition: { field: 'host.name', operator: 'is', value: 'server-1' },
              },
            ],
            dataset: { type: 'dataView', id: 'test-data-view' },
            columns: [{ name: 'host.name' }, { name: 'message' }],
            sort: [{ name: '@timestamp', direction: 'desc' as const }],
          },
        ],
      };

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);

      const inResult = transforms.transformIn!(originalAsCode);
      const outResult = transforms.transformOut!(inResult.state, inResult.references) as Record<
        string,
        unknown
      >;

      const tabs = outResult.tabs as Array<Record<string, unknown>>;
      expect(tabs).toHaveLength(1);

      const filters = tabs[0].filters as Array<Record<string, unknown>>;
      expect(filters).toHaveLength(1);
      expect(filters[0]).toHaveProperty('type', 'condition');
      const condition = (filters[0] as Record<string, Record<string, unknown>>).condition;
      expect(condition.field).toBe('host.name');
      expect(condition.operator).toBe('is');
      expect(condition.value).toBe('server-1');

      expect(tabs[0].columns).toEqual([{ name: 'host.name' }, { name: 'message' }]);
      expect(tabs[0].sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
    });
  });
});
