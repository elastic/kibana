/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { convertValueToString } from './convert_value_to_string';
import { formatFieldValue } from './format_value';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { buildDataViewMock } from '../__mocks__';

export const mockSourceField = {
  name: '_source',
  type: '_source',
  esTypes: ['_source'],
  scripted: false,
  searchable: false,
  aggregatable: false,
  readFromDocValues: false,
} as DataViewField;

export const mockStringField = {
  count: 0,
  name: 'array_objects.description.keyword',
  type: 'string',
  esTypes: ['keyword'],
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  subType: {
    multi: {
      parent: 'array_objects.description',
    },
  },
} as DataViewField;

export const dataViewComplexMock = buildDataViewMock({
  name: 'data-view-with-various-field-types',
  fields: [mockSourceField, mockStringField] as DataView['fields'],
  timeFieldName: 'data',
});

// The format_value file has its own test suite, so we can mock it here to avoid duplication.
jest.mock('./format_value');
const mockFormatFieldValue = jest.mocked(formatFieldValue);

describe('convertValueToString', () => {
  describe('when the data view field type is _source', () => {
    it('should stringify the flattened value', () => {
      const result = convertValueToString({
        dataView: dataViewComplexMock,
        dataViewField: mockSourceField,
        flattenedValue: 'test',
        dataTableRecord: {
          id: '1',
          raw: {},
          flattened: { testKey: 'testValue' },
        },
        fieldFormats: fieldFormatsMock,
        options: { compatibleWithCSV: true },
      });

      expect(result).toEqual({
        formattedString: `{\"testKey\":\"testValue\"}`,
        withFormula: false,
      });
    });
  });

  describe('when the data view field type is not _source', () => {
    describe('when the flattened value is an array', () => {
      it('should format the values and join them with a comma', () => {
        mockFormatFieldValue.mockReturnValueOnce('value1').mockReturnValueOnce('value2');

        const result = convertValueToString({
          dataView: dataViewComplexMock,
          dataViewField: mockStringField,
          flattenedValue: ['value1', 'value2'],
          dataTableRecord: {
            id: '1',
            raw: {},
            flattened: { testKey: 'testValue' },
          },
          fieldFormats: fieldFormatsMock,
          options: { compatibleWithCSV: true },
        });

        expect(result).toEqual({
          formattedString: `value1, value2`,
          withFormula: false,
        });
      });
    });

    describe('when the flattened value is not an array', () => {
      it('should format the value', () => {
        mockFormatFieldValue.mockReturnValue('formattedValue');

        const result = convertValueToString({
          dataView: dataViewComplexMock,
          dataViewField: mockStringField,
          flattenedValue: 'value',
          dataTableRecord: {
            id: '1',
            raw: {},
            flattened: { testKey: 'testValue' },
          },
          fieldFormats: fieldFormatsMock,
          options: { compatibleWithCSV: true },
        });

        expect(result).toEqual({
          formattedString: `formattedValue`,
          withFormula: false,
        });
      });
    });
  });
});
