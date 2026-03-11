/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getFormattedFields } from './get_formatted_fields';
import { formatFieldValue } from './format_value';
import type { DataTableRecord } from '../types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

jest.mock('./format_value', () => ({
  formatFieldValue: jest.fn(),
}));

describe('getFormattedFields', () => {
  const mockDataView = {
    fields: {
      getByName: jest.fn(),
    },
  } as unknown as DataView;

  const mockFieldFormats = {} as FieldFormatsStart;

  const mockDoc: DataTableRecord = {
    id: '1',
    flattened: {
      field1: 'value1',
      field2: 123,
      field3: null,
      field4: undefined,
    },
    raw: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats fields correctly when values exist', () => {
    (formatFieldValue as jest.Mock).mockImplementation((value) => `formatted_${value}`);

    const result = getFormattedFields(mockDoc, ['field1', 'field2'], {
      dataView: mockDataView,
      fieldFormats: mockFieldFormats,
    });

    expect(result).toEqual({
      field1: 'formatted_value1',
      field2: 'formatted_123',
    });

    expect(formatFieldValue).toHaveBeenCalledWith(
      'value1',
      mockDoc.raw,
      mockFieldFormats,
      mockDataView,
      undefined
    );
    expect(formatFieldValue).toHaveBeenCalledWith(
      123,
      mockDoc.raw,
      mockFieldFormats,
      mockDataView,
      undefined
    );
  });

  it('returns undefined for fields with null or undefined values', () => {
    const result = getFormattedFields(mockDoc, ['field3', 'field4'], {
      dataView: mockDataView,
      fieldFormats: mockFieldFormats,
    });

    expect(result).toEqual({
      field3: undefined,
      field4: undefined,
    });

    expect(formatFieldValue).not.toHaveBeenCalled();
  });

  it('handles fields not present in the flattened object', () => {
    const result = getFormattedFields(mockDoc, ['nonExistentField'], {
      dataView: mockDataView,
      fieldFormats: mockFieldFormats,
    });

    expect(result).toEqual({
      nonExistentField: undefined,
    });

    expect(formatFieldValue).not.toHaveBeenCalled();
  });

  it('calls dataView.fields.getByName for each field', () => {
    mockDataView.fields.getByName = jest.fn().mockReturnValue('mockField');

    getFormattedFields(mockDoc, ['field1', 'field2'], {
      dataView: mockDataView,
      fieldFormats: mockFieldFormats,
    });

    expect(mockDataView.fields.getByName).toHaveBeenCalledWith('field1');
    expect(mockDataView.fields.getByName).toHaveBeenCalledWith('field2');
  });
});
