/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
import { getExistingFields, buildFieldList, fetchFieldExistence } from './field_existing_utils';

describe('existingFields', () => {
  it('should remove missing fields by matching names', () => {
    expect(
      getExistingFields(
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
      getExistingFields(
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

describe('buildFieldList', () => {
  const indexPattern = {
    title: 'testpattern',
    type: 'type',
    typeMeta: 'typemeta',
    fields: [
      { name: 'foo', scripted: true, lang: 'painless', script: '2+2' },
      {
        name: 'runtime_foo',
        isMapped: false,
        runtimeField: { type: 'long', script: { source: '2+2' } },
      },
      { name: 'bar' },
      { name: '@bar' },
      { name: 'baz' },
      { name: '_mymeta' },
    ],
  };

  it('supports scripted fields', () => {
    const fields = buildFieldList(indexPattern as unknown as DataView, []);
    expect(fields.find((f) => f.isScript)).toMatchObject({
      isScript: true,
      name: 'foo',
      lang: 'painless',
      script: '2+2',
    });
  });

  it('supports runtime fields', () => {
    const fields = buildFieldList(indexPattern as unknown as DataView, []);
    expect(fields.find((f) => f.runtimeField)).toMatchObject({
      name: 'runtime_foo',
      runtimeField: { type: 'long', script: { source: '2+2' } },
    });
  });

  it('supports meta fields', () => {
    const fields = buildFieldList(indexPattern as unknown as DataView, ['_mymeta']);
    expect(fields.find((f) => f.isMeta)).toMatchObject({
      isScript: false,
      isMeta: true,
      name: '_mymeta',
    });
  });
});

describe('fetchFieldExistence', () => {
  const mockDslQuery = { match_all: {} };
  const mockMetaFields = ['_id', '_type'];

  const createMockDataView = (fields: Array<Partial<DataViewField>> = []) => {
    const dataViewFields = [...fields];
    return {
      getIndexPattern: jest.fn().mockReturnValue('test-pattern'),
      getFieldByName: jest.fn((name) => {
        const field = dataViewFields.find((f) => f.name === name);
        return field && { ...field, toSpec: () => field };
      }),
      fields: dataViewFields,
    } as unknown as DataView;
  };

  const createMockDataViewsService = (fields: Array<Partial<DataViewField>>) => {
    return {
      getFieldsForIndexPattern: jest.fn().mockResolvedValue(fields),
      // like the real refresh: applies the new mapping to the data view, keeping saved field attributes
      refreshFields: jest.fn(async (dataView: DataView) => {
        const dataViewFields = dataView.fields as unknown as Array<Partial<DataViewField>>;
        fields.forEach((field) => {
          const index = dataViewFields.findIndex(({ name }) => name === field.name);
          if (index === -1) {
            dataViewFields.push(field);
            return;
          }
          const { customLabel, count } = dataViewFields[index];
          dataViewFields[index] = { ...field, customLabel, count };
        });
      }),
    } as unknown as DataViewsContract;
  };

  const mockSearch = jest.fn().mockResolvedValue({});

  it.each([
    {
      scenario: 'field changes from unmapped to mapped',
      shouldRefresh: true,
      expectedNewFields: [{ name: 'previously_unmapped_field', type: 'keyword' }],
      existingFields: [
        {
          name: 'previously_unmapped_field',
          type: 'text',
          isMapped: false,
        },
      ],
      returnedFields: [
        {
          name: 'previously_unmapped_field',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
        },
      ],
    },
    {
      scenario: 'field type changes',
      shouldRefresh: true,
      expectedNewFields: [
        { name: 'changing_type_field', type: 'long', customLabel: 'Custom label', count: 5 },
      ],
      existingFields: [
        {
          name: 'changing_type_field',
          type: 'keyword',
          isMapped: true,
          customLabel: 'Custom label',
          count: 5,
        },
      ],
      returnedFields: [
        {
          name: 'changing_type_field',
          type: 'long',
          aggregatable: true,
          searchable: true,
        },
      ],
    },
    {
      scenario: 'fields are unchanged',
      shouldRefresh: false,
      expectedNewFields: [],
      existingFields: [
        {
          name: 'unchanged_field',
          type: 'keyword',
          isMapped: true,
        },
      ],
      returnedFields: [
        {
          name: 'unchanged_field',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
        },
      ],
    },
    {
      scenario: 'new fields are detected',
      shouldRefresh: true,
      expectedNewFields: [{ name: 'new_field', type: 'long' }],
      existingFields: [
        {
          name: 'existing_field',
          type: 'keyword',
          isMapped: true,
        },
        // 'new_field' is deliberately missing to simulate a new field
      ],
      returnedFields: [
        { name: 'existing_field', type: 'keyword', aggregatable: true, searchable: true },
        { name: 'new_field', type: 'long', aggregatable: true, searchable: true },
      ],
    },
  ])(
    'should handle when $scenario',
    async ({ shouldRefresh, expectedNewFields, existingFields, returnedFields }) => {
      const mockDataViewsService = createMockDataViewsService(returnedFields);
      const mockDataView = createMockDataView(existingFields as Array<Partial<DataViewField>>);

      const { newFields } = await fetchFieldExistence({
        search: mockSearch,
        dataViewsService: mockDataViewsService,
        dataView: mockDataView,
        dslQuery: mockDslQuery,
        includeFrozen: false,
        metaFields: mockMetaFields,
      });

      if (shouldRefresh) {
        expect(mockDataViewsService.refreshFields).toHaveBeenCalledWith(mockDataView, false, true);
      } else {
        expect(mockDataViewsService.refreshFields).not.toHaveBeenCalled();
      }
      expect(newFields).toMatchObject(expectedNewFields);
    }
  );
});
