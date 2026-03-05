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
import { deserializeState, serializeState } from './serialization_utils';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
} from '../../../server';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { DataGridDensity } from '@kbn/discover-utils';

describe('Serialization utils', () => {
  const uuid = 'mySearchEmbeddable';

  const dataViewId = dataViewMock.id ?? 'test-id';

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

    test('by reference', async () => {
      discoverServiceMock.savedSearch.get = jest.fn().mockReturnValue({
        savedObjectId: 'savedSearch',
        title: 'saved search title',
        description: '',
        columns: ['_source'],
        sort: [['order_date', 'desc']],
        searchSource: {},
        ...(await discoverServiceMock.savedSearch.byValueToSavedSearch(
          {
            attributes: {
              title: 'saved search title',
              description: '',
              columns: ['_source'],
              sort: [['order_date', 'desc']],
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
              kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
              tabs: [],
            },
          },
          true
        )),
      });

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
      discoverServiceMock.savedSearch.get = jest.fn().mockReturnValue({
        savedObjectId: 'savedSearch',
        title: 'saved search title',
        description: '',
        columns: ['_source'],
        sort: [['order_date', 'desc']],
        searchSource: {},
        ...(await discoverServiceMock.savedSearch.byValueToSavedSearch(
          {
            attributes: {
              title: 'saved search title',
              description: '',
              columns: ['_source'],
              sort: [['order_date', 'desc']],
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
              kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
              tabs: [],
            },
          },
          true
        )),
      });

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
      expect(deserializedState.sort).toEqual([['order_date', 'asc']]);
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
          ...savedSearch,
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
            rawSavedObjectAttributes: savedSearch,
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
            rawSavedObjectAttributes: savedSearch,
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
        });

        // TODO: By-reference API shape includes discover_session_id; panel overrides (sampleSize, sort)
        // are stored in the dashboard document but not part of the simplified by-ref schema
        expect(serializedState).toMatchObject({
          discover_session_id: 'test-id',
        });
      });
    });
  });
});
