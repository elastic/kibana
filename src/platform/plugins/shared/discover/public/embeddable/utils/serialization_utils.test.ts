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
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { SavedSearchUnwrapResult } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import type { SearchEmbeddableSerializedState } from '../types';
import { deserializeState, serializeState } from './serialization_utils';

describe('Serialization utils', () => {
  const uuid = 'mySearchEmbeddable';

  const mockedSavedSearchAttributes: SearchEmbeddableSerializedState['attributes'] = {
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
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        id: dataViewMock.id ?? 'test-id',
        type: 'index-pattern',
      },
    ],
  };

  describe('deserialize state', () => {
    test('by value', async () => {
      const serializedState: SerializedPanelState<SearchEmbeddableSerializedState> = {
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

    test('by reference', async () => {
      discoverServiceMock.savedSearch.get = jest.fn().mockReturnValue({
        savedObjectId: 'savedSearch',
        ...(await discoverServiceMock.savedSearch.byValueToSavedSearch(
          {
            attributes: mockedSavedSearchAttributes,
          } as unknown as SavedSearchUnwrapResult,
          true
        )),
      });

      const serializedState: SerializedPanelState<SearchEmbeddableSerializedState> = {
        rawState: {
          title: 'test panel title',
          sort: [['order_date', 'asc']], // overwrite the saved object sort
        },
        references: [
          {
            id: 'savedSearch',
            name: 'savedObjectRef',
            type: 'search',
          },
        ],
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(Object.keys(deserializedState)).toContain('savedObjectId');
      expect(deserializedState.title).toEqual('test panel title');
      expect(deserializedState.sort).toEqual([['order_date', 'asc']]);
    });
  });

  describe('serialize state', () => {
    test('by value', async () => {
      const searchSource = createSearchSourceMock({
        index: dataViewMock,
      });
      const savedSearch = {
        ...mockedSavedSearchAttributes,
        managed: false,
        searchSource,
      };

      const serializedState = await serializeState({
        uuid,
        initialState: {
          ...mockedSavedSearchAttributes,
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
          type: 'search',
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
        references: mockedSavedSearchAttributes.references,
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
          rawState: {},
          references: [
            {
              id: 'test-id',
              name: 'savedObjectRef',
              type: 'search',
            },
          ],
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
          },
          references: [
            {
              id: 'test-id',
              name: 'savedObjectRef',
              type: 'search',
            },
          ],
        });
      });
    });
  });
});
