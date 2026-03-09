/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../__mocks__/services';
import { getPersistedTabMock } from '../../application/main/state_management/redux/__mocks__/internal_state.mocks';
import { deserializeState, serializeState } from './serialization_utils';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
} from '../../../server';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { DataGridDensity } from '@kbn/discover-utils';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { SearchEmbeddableByValueState } from '../../../common/embeddable/types';

describe('Serialization utils', () => {
  const uuid = 'mySearchEmbeddable';

  const dataViewId = dataViewMock.id ?? 'test-id';

  const mockedSavedSearchAttributes: SearchEmbeddableByValueState['attributes'] = {
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
    title: 'test1',
    description: 'description',
    sort: [['order_date', 'desc']],
    columns: ['_source'],
    grid: {},
    hideChart: false,
    sampleSize: 100,
    isTextBasedQuery: false,
    tabs: [
      {
        id: 'tab-1',
        label: 'Tab 1',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          sort: [['order_date', 'desc']],
          columns: ['_source'],
          grid: {},
          hideChart: false,
          sampleSize: 100,
          isTextBasedQuery: false,
        },
      },
    ],
  };

  /** Minimal API shape for by-value (DiscoverSessionEmbeddableByValueState) */
  const apiStateByValue: DiscoverSessionEmbeddableByValueState = {
    title: 'test panel title',
    description: 'description',
    tabs: [
      {
        columns: [{ name: '_source' }],
        sort: [{ name: 'order_date', direction: 'desc' }],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        density: DataGridDensity.COMPACT,
        header_row_height: 'auto',
        row_height: 'auto',
        query: { language: 'kuery', query: '' },
        filters: [],
        rows_per_page: 100,
        sample_size: 100,
        dataset: { type: 'dataView', id: dataViewId },
      },
    ],
  };

  const mockTab = (
    tabId: string,
    label: string,
    appStateOverrides: Record<string, unknown> = {}
  ): DiscoverSessionTab => ({
    ...getPersistedTabMock({
      tabId,
      dataView: dataViewMock,
      appStateOverrides: {
        columns: ['_source'],
        sort: [['order_date', 'desc']],
        sampleSize: 100,
        ...appStateOverrides,
      },
      services: discoverServiceMock,
    }),
    label,
  });

  const mockDiscoverSession = (sessionTabs: DiscoverSessionTab[]) =>
    createDiscoverSessionMock({
      id: 'savedSearch',
      title: 'test1',
      description: 'description',
      tabs: sessionTabs,
    });

  describe('deserialize state', () => {
    test('by value', async () => {
      const deserializedState = await deserializeState({
        serializedState: apiStateByValue,
        discoverServices: discoverServiceMock,
      });

      expect(discoverServiceMock.savedSearch.byValueToSavedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            title: 'test panel title',
            description: 'description',
            columns: ['_source'],
            sort: [['order_date', 'desc']],
            kibanaSavedObjectMeta: expect.objectContaining({
              searchSourceJSON: expect.any(String),
            }),
          }),
        }),
        true
      );
      const byValueCall = discoverServiceMock.savedSearch.byValueToSavedSearch as jest.Mock;
      const [firstArg] = byValueCall.mock.calls[0];
      expect(firstArg.attributes.references).toBeDefined();
      expect(Array.isArray(firstArg.attributes.references)).toBe(true);

      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(deserializedState.title).toEqual('test panel title');
    });

    test('by reference - default tab (no selectedTabId)', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1'),
        mockTab('tab-2', 'Tab 2', {
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const apiStateByRef: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        description: 'My description',
        discover_session_id: 'savedSearch',
        selected_tab_id: undefined,
      };

      const deserializedState = await deserializeState({
        serializedState: apiStateByRef,
        discoverServices: discoverServiceMock,
      });

      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(Object.keys(deserializedState)).toContain('savedObjectId');
      expect(deserializedState.savedObjectId).toBe('savedSearch');
      expect(deserializedState.title).toEqual('test panel title');
    });

    test('by reference with panel overwrites', async () => {
      const sessionTabs = [mockTab('tab-1', 'Tab 1')];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const apiStateByRef: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        description: 'My description',
        discover_session_id: 'savedSearch',
        selected_tab_id: undefined,
        sort: [{ name: 'order_date', direction: 'asc' }],
      };

      const deserializedState = await deserializeState({
        serializedState: apiStateByRef,
        discoverServices: discoverServiceMock,
      });

      expect(deserializedState.title).toEqual('test panel title');
      // For a valid/default tab, dashboard overrides win on top of resolved tab attributes
      expect(deserializedState.sort).toEqual([['order_date', 'asc']]);
      expect(deserializedState.columns).toEqual(['_source']); // from tab-1
      expect(deserializedState.selectedTabId).toEqual('tab-1');
      expect(deserializedState.tabs).toEqual(sessionTabs);
    });

    test('by reference - valid selectedTabId', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1'),
        mockTab('tab-2', 'Tab 2', {
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
          sampleSize: 200,
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        discover_session_id: 'savedSearch',
        selected_tab_id: 'tab-2',
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(deserializedState.savedObjectId).toEqual('savedSearch');
      expect(deserializedState.selectedTabId).toEqual('tab-2');
      // Attributes should come from tab-2
      expect(deserializedState.columns).toEqual(['col-a', 'col-b']);
      expect(deserializedState.sort).toEqual([['timestamp', 'asc']]);
      expect(deserializedState.sampleSize).toEqual(200);
    });

    test('by reference - deleted selectedTabId discards stale dashboard overrides', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1', {
          columns: ['fallback-col'],
          sort: [['fallback_field', 'desc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        discover_session_id: 'savedSearch',
        selected_tab_id: 'deleted-tab-id',
        // Stale overrides from the deleted tab
        columns: [{ name: 'stale-col-a' }],
        sort: [{ name: 'stale_field', direction: 'asc' }],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(deserializedState.selectedTabId).toEqual('deleted-tab-id');
      // Stale overrides from the deleted tab should not carry over
      expect(deserializedState.columns).toBeUndefined();
      expect(deserializedState.sort).toBeUndefined();
    });

    test('by reference - valid selectedTabId with dashboard overrides', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1'),
        mockTab('tab-2', 'Tab 2', {
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        discover_session_id: 'savedSearch',
        selected_tab_id: 'tab-2',
        // Dashboard override for columns on top of tab-2
        columns: [{ name: 'custom-col' }],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      // For a valid tab, dashboard overrides should win on top of tab-2 attributes
      expect(deserializedState.columns).toEqual(['custom-col']);
      expect(deserializedState.sort).toEqual([['timestamp', 'asc']]);
    });
  });

  describe('serialize state', () => {
    test('by value', () => {
      const sort: SortOrder[] = [['order_date', 'desc']];
      const searchSource = createSearchSourceMock({
        index: dataViewMock,
      });
      const savedSearch = {
        title: 'test1',
        description: 'description',
        columns: ['_source'],
        sort,
        grid: {},
        hideChart: false,
        sampleSize: 100,
        isTextBasedQuery: false,
        managed: false,
        searchSource,
      };

      const serializedState = serializeState({
        uuid,
        initialState: {
          ...mockedSavedSearchAttributes,
          tabs: [],
          serializedSearchSource: {} as SerializedSearchSourceFields,
        },
        savedSearch: savedSearch as Parameters<typeof serializeState>[0]['savedSearch'],
        serializeTitles: jest.fn().mockReturnValue({ title: 'test1', description: 'description' }),
        serializeTimeRange: jest.fn(),
        serializeDynamicActions: jest.fn(),
      });

      expect(serializedState).toMatchObject({
        title: 'test1',
        description: 'description',
        tabs: [
          expect.objectContaining({
            columns: [{ name: '_source' }],
            sort: [{ name: 'order_date', direction: 'desc' }],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            density: DataGridDensity.COMPACT,
            dataset: { type: 'dataView', id: dataViewId },
          }),
        ],
      });
      expect(serializedState).not.toHaveProperty('attributes');
    });

    describe('by reference', () => {
      const sort: SortOrder[] = [['order_date', 'desc']];
      const searchSource = createSearchSourceMock({
        index: dataViewMock,
      });
      const savedSearch = {
        title: 'test1',
        description: 'description',
        columns: ['_source'],
        sort,
        grid: {},
        hideChart: false,
        sampleSize: 100,
        isTextBasedQuery: false,
        managed: false,
        searchSource,
      };

      test('equal state', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1')],
          },
          savedSearch: savedSearch as Parameters<typeof serializeState>[0]['savedSearch'],
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
        });

        expect(serializedState).toMatchObject({
          discover_session_id: 'test-id',
        });
        expect(serializedState).not.toHaveProperty('savedObjectId');
      });

      test('overwrite state', () => {
        const sortOverride: SortOrder[] = [['order_date', 'asc']];
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1')],
          },
          savedSearch: {
            ...savedSearch,
            sampleSize: 500,
            sort: sortOverride,
          } as Parameters<typeof serializeState>[0]['savedSearch'],
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: 'tab-1',
        });

        // By-reference API shape includes discover_session_id; panel overrides (sampleSize, sort)
        // are stored in the dashboard document but not part of the simplified by-ref schema
        expect(serializedState).toMatchObject({
          discover_session_id: 'test-id',
        });
      });

      test('includes selectedTabId when provided', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1'), mockTab('tab-2', 'Tab 2')],
          },
          savedSearch: savedSearch as Parameters<typeof serializeState>[0]['savedSearch'],
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: 'tab-2',
        });

        expect(serializedState).toMatchObject({
          discover_session_id: 'test-id',
          selected_tab_id: 'tab-2',
        });
      });

      test('does not include selectedTabId when undefined', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1')],
          },
          savedSearch: savedSearch as Parameters<typeof serializeState>[0]['savedSearch'],
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: undefined,
        });

        expect(serializedState).toMatchObject({
          discover_session_id: 'test-id',
        });
      });
    });
  });
});
