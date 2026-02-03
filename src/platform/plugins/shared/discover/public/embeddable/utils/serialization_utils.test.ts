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
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { discoverServiceMock } from '../../__mocks__/services';
import type {
  SearchEmbeddableByValueState,
  SearchEmbeddableState,
} from '../../../common/embeddable/types';
import { deserializeState, serializeState } from './serialization_utils';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/server';

describe('Serialization utils', () => {
  const uuid = 'mySearchEmbeddable';

  const tabs: DiscoverSessionTab[] = [
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

    test('by reference', async () => {
      discoverServiceMock.savedSearch.get = jest.fn().mockReturnValue({
        savedObjectId: 'savedSearch',
        ...(await discoverServiceMock.savedSearch.byValueToSavedSearch(
          {
            attributes: mockedSavedSearchAttributes,
          },
          true
        )),
      });

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
      expect(deserializedState.sort).toEqual([['order_date', 'asc']]);
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
          savedObjectId: 'test-id',
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
          sampleSize: 500,
          sort: [['order_date', 'asc']],
          savedObjectId: 'test-id',
        });
      });
    });
  });
});
