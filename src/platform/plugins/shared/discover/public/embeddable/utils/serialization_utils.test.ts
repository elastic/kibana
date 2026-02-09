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
import type { SerializedPanelState } from '@kbn/presentation-publishing';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { discoverServiceMock } from '../../__mocks__/services';
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

  const mockDiscoverSessionTab = (
    overrides: Partial<DiscoverSessionTab> & { id: string; label: string }
  ): DiscoverSessionTab => ({
    sort: [['order_date', 'desc']],
    columns: ['_source'],
    grid: {},
    hideChart: false,
    sampleSize: 100,
    isTextBasedQuery: false,
    serializedSearchSource: {
      index: dataViewMock.id,
    } as SerializedSearchSourceFields,
    ...overrides,
  });

  const mockDiscoverSession = (sessionTabs: DiscoverSessionTab[]): DiscoverSession => ({
    id: 'savedSearch',
    title: 'test1',
    description: 'description',
    tabs: sessionTabs,
    managed: false,
  });

  describe('deserialize state', () => {
    test('by value', async () => {
      const serializedState: SerializedPanelState<SearchEmbeddableState> = {
        rawState: {
          attributes: mockedSavedSearchAttributes,
          title: 'test panel title',
        },
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: dataViewMock.id ?? 'test-id',
            type: 'index-pattern',
          },
        ],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });

      expect(discoverServiceMock.savedSearch.byValueToSavedSearch).toBeCalledWith(
        serializedState.rawState,
        true // should be serializable
      );
      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(deserializedState.title).toEqual('test panel title');
    });

    test('by reference - default tab (no selectedTabId)', async () => {
      const sessionTabs = [
        mockDiscoverSessionTab({ id: 'tab-1', label: 'Tab 1' }),
        mockDiscoverSessionTab({
          id: 'tab-2',
          label: 'Tab 2',
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: SerializedPanelState<SearchEmbeddableState> = {
        rawState: {
          title: 'test panel title',
          sort: [['order_date', 'asc']], // overwrite the saved object sort
          savedObjectId: 'savedSearch',
        },
        references: [],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(Object.keys(deserializedState)).toContain('savedObjectId');
      expect(deserializedState.title).toEqual('test panel title');
      // Dashboard override should be applied on top of tab-1 defaults
      expect(deserializedState.sort).toEqual([['order_date', 'asc']]);
      expect(deserializedState.columns).toEqual(['_source']); // from tab-1
      expect(deserializedState.selectedTabId).toBeUndefined();
      expect(deserializedState.isSelectedTabDeleted).toBe(false);
      expect(deserializedState.tabs).toEqual(sessionTabs);
    });

    test('by reference - valid selectedTabId', async () => {
      const sessionTabs = [
        mockDiscoverSessionTab({ id: 'tab-1', label: 'Tab 1' }),
        mockDiscoverSessionTab({
          id: 'tab-2',
          label: 'Tab 2',
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
          sampleSize: 200,
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: SerializedPanelState<SearchEmbeddableState> = {
        rawState: {
          title: 'test panel title',
          savedObjectId: 'savedSearch',
          selectedTabId: 'tab-2',
        },
        references: [],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(deserializedState.savedObjectId).toEqual('savedSearch');
      expect(deserializedState.selectedTabId).toEqual('tab-2');
      expect(deserializedState.isSelectedTabDeleted).toBe(false);
      // Attributes should come from tab-2
      expect(deserializedState.columns).toEqual(['col-a', 'col-b']);
      expect(deserializedState.sort).toEqual([['timestamp', 'asc']]);
      expect(deserializedState.sampleSize).toEqual(200);
    });

    test('by reference - deleted selectedTabId falls back to first tab', async () => {
      const sessionTabs = [
        mockDiscoverSessionTab({
          id: 'tab-1',
          label: 'Tab 1',
          columns: ['fallback-col'],
          sort: [['fallback_field', 'desc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: SerializedPanelState<SearchEmbeddableState> = {
        rawState: {
          title: 'test panel title',
          savedObjectId: 'savedSearch',
          selectedTabId: 'deleted-tab-id',
          // Stale overrides from the deleted tab
          columns: ['stale-col-a'],
          sort: [['stale_field', 'asc']],
        },
        references: [],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(deserializedState.selectedTabId).toEqual('deleted-tab-id');
      expect(deserializedState.isSelectedTabDeleted).toBe(true);
      // Should use fallback tab-1 attributes, NOT stale overrides
      expect(deserializedState.columns).toEqual(['fallback-col']);
      expect(deserializedState.sort).toEqual([['fallback_field', 'desc']]);
    });

    test('by reference - valid selectedTabId with dashboard overrides', async () => {
      const sessionTabs = [
        mockDiscoverSessionTab({ id: 'tab-1', label: 'Tab 1' }),
        mockDiscoverSessionTab({
          id: 'tab-2',
          label: 'Tab 2',
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: SerializedPanelState<SearchEmbeddableState> = {
        rawState: {
          title: 'test panel title',
          savedObjectId: 'savedSearch',
          selectedTabId: 'tab-2',
          // Dashboard override for columns on top of tab-2
          columns: ['custom-col'],
        },
        references: [],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      // Dashboard override should take precedence over tab-2 defaults
      expect(deserializedState.columns).toEqual(['custom-col']);
      // Other attributes should come from tab-2
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
          selectedTabId: undefined,
          serializedSearchSource: {} as SerializedSearchSourceFields,
        },
        savedSearch,
        serializeTitles: jest.fn(),
        serializeTimeRange: jest.fn(),
        serializeDynamicActions: jest.fn(),
      });

      const attributes = toSavedSearchAttributes(
        savedSearch,
        searchSource.serialize().searchSourceJSON
      );

      expect(serializedState).toEqual({
        rawState: {
          attributes: {
            ...attributes,
            tabs: [
              {
                ...attributes.tabs![0]!,
                id: expect.any(String),
              },
            ],
            references: mockedSavedSearchAttributes.references,
          },
        },
        references: [],
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
            rawSavedObjectAttributes: savedSearch,
          },
          savedSearch,
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
        });

        expect(serializedState).toEqual({
          rawState: {
            savedObjectId: 'test-id',
          },
          references: [],
        });
      });

      test('overwrite state', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            rawSavedObjectAttributes: savedSearch,
          },
          savedSearch: { ...savedSearch, sampleSize: 500, sort: [['order_date', 'asc']] },
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
        });

        expect(serializedState).toEqual({
          rawState: {
            sampleSize: 500,
            sort: [['order_date', 'asc']],
            savedObjectId: 'test-id',
          },
          references: [],
        });
      });

      test('includes selectedTabId when provided', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            rawSavedObjectAttributes: savedSearch,
          },
          savedSearch,
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: 'tab-2',
        });

        expect(serializedState).toEqual({
          rawState: {
            savedObjectId: 'test-id',
            selectedTabId: 'tab-2',
          },
          references: [],
        });
      });

      test('does not include selectedTabId when undefined', () => {
        const serializedState = serializeState({
          uuid,
          initialState: {
            rawSavedObjectAttributes: savedSearch,
          },
          savedSearch,
          serializeTitles: jest.fn(),
          serializeTimeRange: jest.fn(),
          serializeDynamicActions: jest.fn(),
          savedObjectId: 'test-id',
          selectedTabId: undefined,
        });

        expect(serializedState).toEqual({
          rawState: {
            savedObjectId: 'test-id',
          },
          references: [],
        });
      });
    });
  });
});
