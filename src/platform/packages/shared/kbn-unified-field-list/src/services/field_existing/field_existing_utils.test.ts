/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
import { existingFields, fetchFieldExistence } from './field_existing_utils';

describe('existingFields', () => {
  it('should remove missing fields by matching names', () => {
    expect(
      existingFields(
        [
          { name: 'a', aggregatable: true, searchable: true, type: 'string' },
          { name: 'b', aggregatable: true, searchable: true, type: 'string' },
        ],
        [
          { name: 'a', isScript: false, isMeta: false },
          { name: 'b', isScript: false, isMeta: true },
          { name: 'c', isScript: false, isMeta: false },
        ]
      )
    ).toEqual(['a', 'b']);
  });

  it('should keep scripted and runtime fields', () => {
    expect(
      existingFields(
        [{ name: 'a', aggregatable: true, searchable: true, type: 'string' }],
        [
          { name: 'a', isScript: false, isMeta: false },
          { name: 'b', isScript: true, isMeta: false },
          { name: 'c', runtimeField: { type: 'keyword' }, isMeta: false, isScript: false },
          { name: 'd', isMeta: true, isScript: false },
        ]
      )
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('fetchFieldExistence', () => {
  const mockDslQuery = { match_all: {} };
  const mockMetaFields = ['_id', '_type'];

  const createMockDataView = (fields: Array<Partial<DataViewField>> = []) => {
    return {
      getIndexPattern: jest.fn().mockReturnValue('test-pattern'),
      getFieldByName: jest.fn((name) => fields.find((f) => f.name === name)),
      fields,
    } as unknown as DataView;
  };

  const createMockDataViewsService = (fields: Array<Partial<DataViewField>>) => {
    return {
      getFieldsForIndexPattern: jest.fn().mockResolvedValue(fields),
      refreshFields: jest.fn().mockResolvedValue(undefined),
    } as unknown as DataViewsContract;
  };

  const mockSearch = jest.fn().mockResolvedValue({});

  it('should trigger refresh when a field changes from unmapped to mapped', async () => {
    const fields = [
      {
        name: 'previously_unmapped_field',
        type: 'keyword',
        aggregatable: true,
        searchable: true,
      },
    ];
    const mockDataViewsService = createMockDataViewsService(fields);

    const mockDataView = createMockDataView([
      {
        name: 'previously_unmapped_field',
        type: 'text',
        isMapped: false,
      } as Partial<DataViewField>,
    ]);

    await fetchFieldExistence({
      search: mockSearch,
      dataViewsService: mockDataViewsService,
      dataView: mockDataView,
      dslQuery: mockDslQuery,
      includeFrozen: false,
      metaFields: mockMetaFields,
    });

    expect(mockDataViewsService.refreshFields).toHaveBeenCalledWith(mockDataView, false, true);
  });

  it('should trigger refresh when a field type changes', async () => {
    const fields = [
      { name: 'changing_type_field', type: 'long', aggregatable: true, searchable: true },
    ];
    const mockDataViewsService = createMockDataViewsService(fields);

    const mockDataView = createMockDataView([
      {
        name: 'changing_type_field',
        type: 'keyword',
        isMapped: true,
      } as Partial<DataViewField>,
    ]);

    await fetchFieldExistence({
      search: mockSearch,
      dataViewsService: mockDataViewsService,
      dataView: mockDataView,
      dslQuery: mockDslQuery,
      includeFrozen: false,
      metaFields: mockMetaFields,
    });

    expect(mockDataViewsService.refreshFields).toHaveBeenCalledWith(mockDataView, false, true);
  });

  it('should not trigger refresh when fields are unchanged', async () => {
    const fields = [
      { name: 'unchanged_field', type: 'keyword', aggregatable: true, searchable: true },
    ];
    const mockDataViewsService = createMockDataViewsService(fields);

    const mockDataView = createMockDataView([
      {
        name: 'unchanged_field',
        type: 'keyword',
        isMapped: true,
      } as Partial<DataViewField>,
    ]);

    await fetchFieldExistence({
      search: mockSearch,
      dataViewsService: mockDataViewsService,
      dataView: mockDataView,
      dslQuery: mockDslQuery,
      includeFrozen: false,
      metaFields: mockMetaFields,
    });

    expect(mockDataViewsService.refreshFields).not.toHaveBeenCalled();
  });

  it('should trigger refresh when new fields are detected', async () => {
    const fields = [
      { name: 'existing_field', type: 'keyword', aggregatable: true, searchable: true },
      { name: 'new_field', type: 'long', aggregatable: true, searchable: true },
    ];
    const mockDataViewsService = createMockDataViewsService(fields);

    const mockDataView = createMockDataView([
      {
        name: 'existing_field',
        type: 'keyword',
        isMapped: true,
      } as Partial<DataViewField>,
      // 'new_field' is not present in the data view, simulating a new field
    ]);

    await fetchFieldExistence({
      search: mockSearch,
      dataViewsService: mockDataViewsService,
      dataView: mockDataView,
      dslQuery: mockDslQuery,
      includeFrozen: false,
      metaFields: mockMetaFields,
    });

    expect(mockDataViewsService.refreshFields).toHaveBeenCalledWith(mockDataView, false, true);
  });
});
