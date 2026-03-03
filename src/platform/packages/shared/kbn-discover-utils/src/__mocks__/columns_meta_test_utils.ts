/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldList } from '@kbn/data-views-plugin/common';
import { buildDataViewMock } from './data_view';
import type { DataTableColumnsMeta } from '../types';
import * as formatValueModule from '../utils/format_value';

/**
 * Creates a data view with a bytes field typed as number.
 * Used for testing columnsMeta override scenarios where the data view
 * has a field but ES|QL returns it with a different type.
 */
export const createDataViewWithBytesField = () =>
  buildDataViewMock({
    name: 'test-data-view',
    fields: fieldList([
      {
        name: '_index',
        type: 'string',
        scripted: false,
        searchable: true,
        aggregatable: false,
      },
      {
        name: '_source',
        type: '_source',
        scripted: false,
        searchable: false,
        aggregatable: false,
      },
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        scripted: false,
        searchable: true,
        aggregatable: true,
      },
      {
        name: '@timestamp',
        type: 'date',
        scripted: false,
        searchable: true,
        aggregatable: true,
      },
    ]),
  });

/**
 * Creates a data view without a bytes field.
 * Used for testing scenarios where ES|QL returns a computed field
 * not present in the data view.
 */
export const createDataViewWithoutCustomField = () =>
  buildDataViewMock({
    name: 'test-data-view',
    fields: fieldList([
      {
        name: '_index',
        type: 'string',
        scripted: false,
        searchable: true,
        aggregatable: false,
      },
      {
        name: '_source',
        type: '_source',
        scripted: false,
        searchable: false,
        aggregatable: false,
      },
      {
        name: '@timestamp',
        type: 'date',
        scripted: false,
        searchable: true,
        aggregatable: true,
      },
    ]),
  });

/**
 * columnsMeta that overrides bytes from number to string/keyword.
 * Used for testing when ES|QL query returns a field with a different
 * type than defined in the data view.
 */
export const columnsMetaOverridingBytesType: DataTableColumnsMeta = {
  bytes: {
    type: 'string',
    esType: 'keyword',
  },
};

/**
 * columnsMeta for a custom ES|QL field not in the data view.
 */
export const columnsMetaWithCustomField: DataTableColumnsMeta = {
  custom_esql_field: {
    type: 'number',
    esType: 'long',
  },
};

/**
 * Creates a spy on formatFieldValue that returns 'formatted'.
 * Remember to call mockRestore() in afterEach.
 */
export const createFormatFieldValueSpy = () => {
  return jest.spyOn(formatValueModule, 'formatFieldValue').mockReturnValue('formatted');
};

/**
 * Finds a call to formatFieldValue for a specific field name.
 * The field is passed as the 5th argument (index 4) to formatFieldValue.
 */
export const findFieldCallInSpy = (spy: jest.SpyInstance, fieldName: string) => {
  return spy.mock.calls.find((call) => call[4]?.name === fieldName);
};

/**
 * Asserts that formatFieldValue was called with a field matching the expected properties.
 */
export const expectFieldCallToMatch = (
  spy: jest.SpyInstance,
  fieldName: string,
  expectedType: string,
  expectedEsTypes?: string[]
) => {
  const fieldCall = findFieldCallInSpy(spy, fieldName);
  expect(fieldCall).toBeDefined();
  expect(fieldCall![4]).toMatchObject({
    name: fieldName,
    type: expectedType,
    ...(expectedEsTypes && { esTypes: expectedEsTypes }),
  });
};
