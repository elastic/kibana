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
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { discoverServiceMock } from '../../__mocks__/services';
import { getPersistedTabMock } from '../../application/main/state_management/redux/__mocks__/internal_state.mocks';
import type {
  SearchEmbeddableByValueState,
  SearchEmbeddableState,
} from '../../../common/embeddable/types';
import { deserializeState, serializeState } from './serialization_utils';
import type { DiscoverSessionTab as DiscoverSessionTabSchema } from '@kbn/saved-search-plugin/server';

describe('Serialization utils', () => {
  const uuid = 'mySearchEmbeddable';

  const tabs: DiscoverSessionTabSchema[] = [
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
        hideTable: false,
        sampleSize: 100,
        isTextBasedQuery: false,
      },
    },
  ];
  const mockedSavedSearchAttributes: SearchEmbeddableByValueState['attributes'] = {
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
    title: 'test1',
    sort: [['order_date', 'desc']],
    columns: ['_source'],
    description: 'description',
    grid: {},
    hideChart: false,
    hideTable: false,
    sampleSize: 100,
    isTextBasedQuery: false,
    tabs,
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        id: dataViewMock.id ?? 'test-id',
        type: 'index-pattern',
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
      const serializedState: SearchEmbeddableState = {
        attributes: mockedSavedSearchAttributes,
        title: 'test panel title',
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });

      expect(discoverServiceMock.savedSearch.byValueToSavedSearch).toBeCalledWith(
        serializedState,
        true // should be serializable
      );
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

      const serializedState: SearchEmbeddableState = {
        title: 'test panel title',
        sort: [['order_date', 'asc']], // overwrite the saved object sort
        savedObjectId: 'savedSearch',
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(Object.keys(deserializedState)).toContain('savedObjectId');
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

      const serializedState: SearchEmbeddableState = {
        title: 'test panel title',
        savedObjectId: 'savedSearch',
        selectedTabId: 'tab-2',
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

      const serializedState: SearchEmbeddableState = {
        title: 'test panel title',
        savedObjectId: 'savedSearch',
        selectedTabId: 'deleted-tab-id',
        // Stale overrides from the deleted tab
        columns: ['stale-col-a'],
        sort: [['stale_field', 'asc']],
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

      const serializedState: SearchEmbeddableState = {
        title: 'test panel title',
        savedObjectId: 'savedSearch',
        selectedTabId: 'tab-2',
        // Dashboard override for columns on top of tab-2
        columns: ['custom-col'],
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
      const searchSource = createSearchSourceMock({
        index: dataViewMock,
      });
      const savedSearch = {
        ...mockedSavedSearchAttributes,
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
        savedSearch,
        serializeTitles: jest.fn(),
        serializeTimeRange: jest.fn(),
        serializeDynamicActions: jest.fn(),
      });

      const searchSourceJSON = JSON.stringify(searchSource.getSerializedFields());
      const attributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

      expect(serializedState).toEqual({
        attributes: {
          ...attributes,
          tabs: [
            {
              ...attributes.tabs![0]!,
              id: expect.any(String),
            },
          ],
        },
      });
    });

    describe('by reference', () => {
      const searchSource = createSearchSourceMock({
        index: dataViewMock,
      });

      const savedSearch = {
        ...mockedSavedSearchAttributes,
        managed: false,
        searchSource,
      };

      test('equal state', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1')],
          },
          savedSearch,
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
        });

        expect(serializedState).toEqual({
          savedObjectId: 'test-id',
        });
      });

      test('overwrite state', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1')],
          },
          savedSearch: { ...savedSearch, sampleSize: 500, sort: [['order_date', 'asc']] },
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: 'tab-1',
        });

        expect(serializedState).toEqual({
          sampleSize: 500,
          sort: [['order_date', 'asc']],
          savedObjectId: 'test-id',
          selectedTabId: 'tab-1',
        });
      });

      test('includes selectedTabId when provided', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1'), mockTab('tab-2', 'Tab 2')],
          },
          savedSearch,
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: 'tab-2',
        });

        expect(serializedState).toEqual({
          savedObjectId: 'test-id',
          selectedTabId: 'tab-2',
        });
      });

      test('does not include selectedTabId when undefined', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            tabs: [mockTab('tab-1', 'Tab 1')],
          },
          savedSearch,
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: undefined,
        });

        expect(serializedState).toEqual({
          savedObjectId: 'test-id',
        });
      });
    });
  });
});
