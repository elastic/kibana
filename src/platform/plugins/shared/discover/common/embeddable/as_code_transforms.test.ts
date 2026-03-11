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
        const asCodeState = {
          discover_session_id: 'test-session-id',
          title: 'My Session',
        };

        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!(asCodeState);

        expect(result.references).toContainEqual({
          name: 'savedObjectRef',
          type: 'search',
          id: 'test-session-id',
        });
        expect(result.state).not.toHaveProperty('discover_session_id');
        expect(result.state).toHaveProperty('title', 'My Session');
      });

      it('converts selected_tab_id to selectedTabId', () => {
        const asCodeState = {
          discover_session_id: 'test-session-id',
          selected_tab_id: 'tab-1',
        };

        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!(asCodeState);

        expect(result.state).toHaveProperty('selectedTabId', 'tab-1');
      });
    });

    describe('by-value state', () => {
      it('converts a classic tab with filters to stored format', () => {
        const asCodeState = {
          title: 'My Session',
          description: 'Test description',
          tabs: [
            {
              columns: [
                { name: 'field1', width: 200 },
                { name: 'field2' },
              ],
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
                  condition: {
                    field: 'status',
                    operator: 'is',
                    value: 'active',
                  },
                },
              ],
              dataset: { type: 'dataView', id: 'test-data-view' },
            },
          ],
        };

        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!(asCodeState);

        expect(result.state).toHaveProperty('attributes');
        const attrs = (result.state as any).attributes;
        expect(attrs.title).toBe('My Session');
        expect(attrs.tabs).toHaveLength(1);

        const tab = attrs.tabs[0];
        expect(tab.id).toBeDefined();
        expect(tab.label).toBe('My Session');
        expect(tab.attributes.columns).toEqual(['field1', 'field2']);
        expect(tab.attributes.sort).toEqual([['@timestamp', 'desc']]);
        expect(tab.attributes.grid).toEqual({ columns: { field1: { width: 200 } } });
        expect(tab.attributes.viewMode).toBe('documents');
        expect(tab.attributes.density).toBe('compact');
        expect(tab.attributes.rowHeight).toBe(3);
        expect(tab.attributes.rowsPerPage).toBe(100);
        expect(tab.attributes.sampleSize).toBe(500);
        expect(tab.attributes.isTextBasedQuery).toBe(false);

        const searchSource = JSON.parse(tab.attributes.kibanaSavedObjectMeta.searchSourceJSON);
        expect(searchSource.query).toEqual({ language: 'kuery', query: 'field1: value' });
        expect(searchSource.filter).toBeDefined();
      });

      it('converts an ES|QL tab to stored format', () => {
        const asCodeState = {
          title: 'ESQL Session',
          tabs: [
            {
              query: { esql: 'FROM logs-* | LIMIT 10' },
              columns: [{ name: 'message' }],
              sort: [{ name: '@timestamp', direction: 'desc' as const }],
            },
          ],
        };

        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!(asCodeState);

        const attrs = (result.state as any).attributes;
        const tab = attrs.tabs[0];
        expect(tab.attributes.isTextBasedQuery).toBe(true);
        expect(tab.attributes.columns).toEqual(['message']);
        expect(tab.attributes.sort).toEqual([['@timestamp', 'desc']]);
      });

      it('handles empty filters gracefully', () => {
        const asCodeState = {
          title: 'No Filters Session',
          tabs: [
            {
              filters: [],
              dataset: { type: 'dataView', id: 'test-data-view' },
            },
          ],
        };

        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!(asCodeState);

        const tab = (result.state as any).attributes.tabs[0];
        const searchSource = JSON.parse(tab.attributes.kibanaSavedObjectMeta.searchSourceJSON);
        expect(searchSource.filter).toBeUndefined();
      });

      it('converts group filters correctly', () => {
        const asCodeState = {
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
        };

        const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
        const result = transforms.transformIn!(asCodeState);

        const tab = (result.state as any).attributes.tabs[0];
        const searchSource = JSON.parse(tab.attributes.kibanaSavedObjectMeta.searchSourceJSON);
        expect(searchSource.filter).toBeDefined();
        expect(searchSource.filter).toHaveLength(1);
        expect(searchSource.filter[0].meta.type).toBe('combined');
      });
    });
  });

  describe('transformOut', () => {
    it('converts a stored by-reference state to as-code format', () => {
      const storedState: StoredSearchEmbeddableState = {
        title: 'My Session',
        description: 'Test',
      };
      const references = [
        { name: 'savedObjectRef', type: 'search', id: 'test-session-id' },
      ];

      const transforms = getSearchEmbeddableAsCodeTransforms(mockDrilldownTransforms);
      const result = transforms.transformOut!(storedState, references);

      expect(result).toHaveProperty('discover_session_id', 'test-session-id');
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
        query: {
          match_phrase: { status: 'active' },
        },
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
          viewMode: 'documents',
          density: 'compact',
          rowHeight: 3,
          rowsPerPage: 100,
          sampleSize: 500,
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
      expect(tab.filters).toBeDefined();
      const filters = tab.filters as Array<Record<string, unknown>>;
      expect(filters).toHaveLength(1);
      expect(filters[0]).toHaveProperty('type', 'condition');
      expect(filters[0]).toHaveProperty('condition');
      const condition = filters[0].condition as Record<string, unknown>;
      expect(condition.field).toBe('status');
      expect(condition.operator).toBe('is');
      expect(condition.value).toBe('active');

      expect(tab.dataset).toEqual({ type: 'dataView', id: 'test-data-view' });
      expect(tab.columns).toEqual([
        { name: 'field1', width: 200 },
        { name: 'field2' },
      ]);
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
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
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
        query: {
          range: {
            bytes: { gte: 1000, lte: 5000 },
          },
        },
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
                  searchSourceJSON: JSON.stringify({
                    filter: [storedFilter],
                  }),
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
      const condition = (filters[0] as any).condition;
      expect(condition.field).toBe('bytes');
      expect(condition.operator).toBe('range');
      expect(condition.value).toEqual({ gte: 1000, lte: 5000 });
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
                condition: {
                  field: 'host.name',
                  operator: 'is',
                  value: 'server-1',
                },
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
      const outResult = transforms.transformOut!(
        inResult.state,
        inResult.references
      ) as Record<string, unknown>;

      const tabs = outResult.tabs as Array<Record<string, unknown>>;
      expect(tabs).toHaveLength(1);

      const filters = tabs[0].filters as Array<Record<string, unknown>>;
      expect(filters).toHaveLength(1);
      expect(filters[0]).toHaveProperty('type', 'condition');
      const condition = (filters[0] as any).condition;
      expect(condition.field).toBe('host.name');
      expect(condition.operator).toBe('is');
      expect(condition.value).toBe('server-1');

      expect(tabs[0].columns).toEqual([{ name: 'host.name' }, { name: 'message' }]);
      expect(tabs[0].sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
    });
  });
});
