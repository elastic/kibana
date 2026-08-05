/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldList } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { EsqlSource } from '@kbn/data-source';
import { buildDataViewMock } from './data_view';
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

const BYTES_OVERRIDE_COLUMNS: DatatableColumn[] = [
  { id: 'bytes', name: 'bytes', meta: { type: 'string', esType: 'keyword' } },
];

const CUSTOM_FIELD_COLUMNS: DatatableColumn[] = [
  { id: 'custom_esql_field', name: 'custom_esql_field', meta: { type: 'number', esType: 'long' } },
];

/**
 * Builds an `EsqlSource` whose `bytes` result column overrides the data view's
 * `number` type with `string`/`keyword`. Used for testing when an ES|QL query
 * returns a field with a different type than defined in the data view.
 */
export const createEsqlSourceOverridingBytesType = () =>
  EsqlSource.create({ query: 'FROM test-data-view', resultColumns: BYTES_OVERRIDE_COLUMNS });

/**
 * Builds an `EsqlSource` with a `custom_esql_field` result column not present
 * in the data view.
 */
export const createEsqlSourceWithCustomField = () =>
  EsqlSource.create({ query: 'FROM test-data-view', resultColumns: CUSTOM_FIELD_COLUMNS });

/**
 * Creates a spy on formatFieldValueReact that returns 'formatted'.
 * Remember to call mockRestore() in afterEach.
 */
export const createFormatFieldValueReactSpy = () => {
  return jest.spyOn(formatValueModule, 'formatFieldValueReact').mockReturnValue('formatted');
};

/**
 * Finds a call to formatFieldValueReact for a specific field name.
 * The field is passed as part of the object parameter.
 */
export const findFieldCallInSpy = (spy: jest.SpyInstance, fieldName: string) => {
  return spy.mock.calls.find((call) => call[0]?.field?.name === fieldName);
};

/**
 * Asserts that formatFieldValueReact was called with a field matching the expected properties.
 */
export const expectFieldCallToMatch = (
  spy: jest.SpyInstance,
  fieldName: string,
  expectedType: string,
  expectedEsTypes?: string[]
) => {
  const fieldCall = findFieldCallInSpy(spy, fieldName);
  expect(fieldCall).toBeDefined();
  expect(fieldCall![0].field).toMatchObject({
    name: fieldName,
    type: expectedType,
    ...(expectedEsTypes && { esTypes: expectedEsTypes }),
  });
};
