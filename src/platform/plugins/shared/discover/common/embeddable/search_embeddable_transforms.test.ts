/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { getSearchEmbeddableTransforms } from './search_embeddable_transforms';
import type {
  SearchEmbeddableState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';
import type {
  DiscoverSessionClassicTab,
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
  DiscoverSessionEmbeddableState,
} from '../../server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './constants';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { DataGridDensity } from '@kbn/discover-utils';

const mockDrilldownTransforms = {
  transformIn: jest.fn().mockImplementation((state: DiscoverSessionEmbeddableState) => ({
    state,
    references: [],
  })),
  transformOut: jest.fn().mockImplementation((state: StoredSearchEmbeddableState) => state),
} as unknown as DrilldownTransforms;

describe('searchEmbeddableTransforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const whenEnabled = () => true;
  const whenDisabled = () => false;

  describe('transformOut', () => {
    it('converts by-reference stored state to DiscoverSession API shape', () => {
      const state: StoredSearchEmbeddableState = {
        title: 'Test Title',
        description: 'Test Description',
        time_range: { from: 'now-15m', to: 'now' },
      };
      const references = [
        { name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME, type: SavedSearchType, id: 'session-123' },
      ];
      const result = getSearchEmbeddableTransforms(
        mockDrilldownTransforms,
        whenEnabled
      ).transformOut?.(state, references);
      expect(result).toEqual({
        title: 'Test Title',
        description: 'Test Description',
        time_range: { from: 'now-15m', to: 'now' },
        ref_id: 'session-123',
        selected_tab_id: undefined,
        overrides: {},
      });
      expect(mockDrilldownTransforms.transformOut).toHaveBeenCalledWith(state, references);
    });

    it('converts by-value stored state to DiscoverSession API shape with tabs', () => {
      const state: StoredSearchEmbeddableByValueState = {
        title: 'Panel Title',
        description: 'Panel description',
        attributes: {
          title: '',
          description: '',
          columns: ['message', '@timestamp'],
          sort: [['@timestamp', 'desc']],
          grid: { columns: { '@timestamp': { width: 200 } } },
          hideChart: false,
          hideTable: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              index: 'data-view-1',
              query: { language: 'kuery', query: '' },
              filter: [],
            }),
          },
          tabs: [
            {
              id: 'tab-1',
              label: 'Untitled',
              attributes: {
                columns: ['message', '@timestamp'],
                sort: [['@timestamp', 'desc']],
                grid: { columns: { '@timestamp': { width: 200 } } },
                hideChart: false,
                hideTable: false,
                isTextBasedQuery: false,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    index: 'data-view-1',
                    query: { language: 'kuery', query: '' },
                    filter: [],
                  }),
                },
              },
            },
          ],
        },
      };
      const references = [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'data-view-1',
        },
      ];
      const result = getSearchEmbeddableTransforms(
        mockDrilldownTransforms,
        whenEnabled
      ).transformOut?.(state, references) as DiscoverSessionEmbeddableByValueState;
      expect(result.title).toBe('Panel Title');
      expect(result.description).toBe('Panel description');
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].column_order).toEqual(['message', '@timestamp']);
      expect(result.tabs[0].column_settings).toEqual({
        '@timestamp': { width: 200 },
      });
      const {
        sort,
        view_mode: viewMode,
        density,
        data_source: dataSource,
      } = result.tabs[0] as DiscoverSessionClassicTab;
      expect(sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
      expect(viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
      expect(density).toBe(DataGridDensity.COMPACT);
      expect(dataSource).toEqual({
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'data-view-1',
      });
      expect(mockDrilldownTransforms.transformOut).toHaveBeenCalledWith(state, references);
    });

    it('calls transformDrilldownsOut with state and references', () => {
      const state: StoredSearchEmbeddableState = {
        title: 'Test Title',
        description: 'Test Description',
        drilldowns: [],
      };
      const mockReferences = [
        { name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME, type: SavedSearchType, id: 'session-xyz' },
      ];
      const result = getSearchEmbeddableTransforms(
        mockDrilldownTransforms,
        whenEnabled
      ).transformOut?.(state, mockReferences);
      expect(mockDrilldownTransforms.transformOut).toHaveBeenCalledWith(state, mockReferences);
      expect(result).toMatchObject({
        title: 'Test Title',
        description: 'Test Description',
        ref_id: 'session-xyz',
      });
    });

    it('transforms by-reference state', () => {
      const state: StoredSearchEmbeddableState = {
        title: 'Test Title',
        description: 'Test Description',
      };
      const result = getSearchEmbeddableTransforms(
        mockDrilldownTransforms,
        whenDisabled
      ).transformOut?.(state, [
        {
          id: '2f360f30-ea74-11eb-b4c6-3d2afc1cb389',
          name: 'savedObjectRef',
          type: 'search',
        },
      ]);
      expect(result).toEqual({ ...state, savedObjectId: '2f360f30-ea74-11eb-b4c6-3d2afc1cb389' });
    });
  });

  describe('transformIn', () => {
    describe('by-reference state', () => {
      it('converts DiscoverSession by-reference API state to stored state with references', () => {
        const apiState: DiscoverSessionEmbeddableByReferenceState = {
          title: 'Test Search',
          description: 'Test Description',
          time_range: { from: 'now-15m', to: 'now' },
          ref_id: 'test-saved-object-id',
          selected_tab_id: undefined,
          overrides: {},
        };

        const result = getSearchEmbeddableTransforms(mockDrilldownTransforms, whenEnabled)
          .transformIn!(apiState);

        expect(result.state).toEqual({
          title: 'Test Search',
          description: 'Test Description',
          time_range: { from: 'now-15m', to: 'now' },
        });
        expect(result.references).toEqual([
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: 'test-saved-object-id',
          },
        ]);
        expect(mockDrilldownTransforms.transformIn).toHaveBeenCalledWith(apiState);
      });

      it('handles by-reference API state with selected_tab_id', () => {
        const apiState: DiscoverSessionEmbeddableByReferenceState = {
          title: 'My Search',
          description: 'My description',
          time_range: { from: 'now-1h', to: 'now' },
          ref_id: 'session-456',
          selected_tab_id: 'tab-1',
          overrides: {},
        };

        const result = getSearchEmbeddableTransforms(mockDrilldownTransforms, whenEnabled)
          .transformIn!(apiState);

        expect(result.state).toEqual({
          title: 'My Search',
          description: 'My description',
          time_range: { from: 'now-1h', to: 'now' },
          selectedTabId: 'tab-1',
        });
        expect(result.references).toEqual([
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: 'session-456',
          },
        ]);
      });
    });

    describe('by-value state', () => {
      it('converts DiscoverSession by-value API state to stored state with references', () => {
        const apiState: DiscoverSessionEmbeddableByValueState = {
          title: 'Panel Title',
          description: 'Panel description',
          tabs: [
            {
              column_order: ['message', '@timestamp'],
              column_settings: { '@timestamp': { width: 200 } },
              sort: [{ name: '@timestamp', direction: 'desc' }],
              view_mode: VIEW_MODE.DOCUMENT_LEVEL,
              density: DataGridDensity.COMPACT,
              header_row_height: 'auto',
              row_height: 'auto',
              query: { language: 'kql', expression: '' },
              filters: [],
              rows_per_page: 100,
              sample_size: 1000,
              data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: 'data-view-1' },
            },
          ],
        };

        const result = getSearchEmbeddableTransforms(mockDrilldownTransforms, whenEnabled)
          .transformIn!(apiState);

        expect(result.references).toContainEqual({
          id: 'data-view-1',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        });
        expect((result.state as StoredSearchEmbeddableByValueState).attributes).toBeDefined();
        expect((result.state as StoredSearchEmbeddableByValueState).attributes.tabs).toHaveLength(
          1
        );
        expect(mockDrilldownTransforms.transformIn).toHaveBeenCalledWith(apiState);
      });

      it('includes references so data view ref is stored on dashboard (by-value Classic mode)', () => {
        const dataViewRef = {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          id: 'data-view-id-123',
          type: 'index-pattern',
        };
        const apiState: DiscoverSessionEmbeddableByValueState = {
          title: 'Panel Title',
          tabs: [
            {
              column_order: ['_source'],
              sort: [],
              view_mode: VIEW_MODE.DOCUMENT_LEVEL,
              density: DataGridDensity.COMPACT,
              header_row_height: 3,
              row_height: 3,
              query: { language: 'kql', expression: '' },
              filters: [],
              data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: 'data-view-id-123' },
            },
          ],
        };

        const result = getSearchEmbeddableTransforms(mockDrilldownTransforms, whenEnabled)
          .transformIn!(apiState);

        expect(result.references).toContainEqual(dataViewRef);
        expect((result.state as StoredSearchEmbeddableByValueState).attributes).not.toHaveProperty(
          'references'
        );
      });
    });
  });

  describe('when feature flag is disabled (legacy main behavior)', () => {
    it('transformIn runs legacy transform: extracts savedObjectId to reference (by-ref)', () => {
      const apiState: SearchEmbeddableState = {
        title: 'Title',
        savedObjectId: 'session-1',
      };
      const result = getSearchEmbeddableTransforms(mockDrilldownTransforms, whenDisabled)
        .transformIn!(apiState);
      expect(mockDrilldownTransforms.transformIn).toHaveBeenCalledWith(apiState);
      expect(result.state).not.toHaveProperty('savedObjectId');
      expect(result.references).toContainEqual({
        name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
        type: SavedSearchType,
        id: 'session-1',
      });
    });

    it('transformOut runs legacy transform: injects savedObjectId from references (by-ref)', () => {
      const storedState: StoredSearchEmbeddableState = {
        title: 'Title',
        description: 'Description',
        time_range: { from: 'now-15m', to: 'now' },
      };
      const references = [
        { name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME, type: SavedSearchType, id: 'session-1' },
      ];
      const result = getSearchEmbeddableTransforms(
        mockDrilldownTransforms,
        whenDisabled
      ).transformOut?.(storedState, references);
      expect(mockDrilldownTransforms.transformOut).toHaveBeenCalledWith(
        expect.anything(),
        references
      );
      expect(result).toMatchObject({
        title: 'Title',
        savedObjectId: 'session-1',
      });
    });
  });
});
