/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getFieldsForTerms,
  toSanitizedFieldType,
  getMultiFieldLabel,
  createCachedTextFieldValueFormatter,
  createCachedReactFieldValueFormatter,
} from './fields_utils';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { stubLogstashDataView } from '@kbn/data-plugin/common/stubs';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { StringFormat } from '@kbn/field-formats-plugin/common';

describe('fields_utils', () => {
  describe('toSanitizedFieldType', () => {
    const mockedField = {
      lang: 'painless',
      conflictDescriptions: {},
      aggregatable: true,
      name: 'name',
      type: 'type',
      esTypes: ['long', 'geo'],
    } as FieldSpec;

    test('should sanitize fields ', async () => {
      const fields = [mockedField] as FieldSpec[];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`
        Array [
          Object {
            "label": "name",
            "name": "name",
            "type": "type",
          },
        ]
      `);
    });

    test('should filter non-aggregatable fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          aggregatable: false,
        },
      ];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });

    test('should filter nested fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          subType: {
            nested: {
              path: 'path',
            },
          },
        },
      ];
      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('getFieldsForTerms', () => {
    test('should return fields as array', () => {
      expect(getFieldsForTerms('field')).toEqual(['field']);
      expect(getFieldsForTerms(['field', 'field1'])).toEqual(['field', 'field1']);
    });

    test('should exclude empty values', () => {
      expect(getFieldsForTerms([null, ''])).toEqual([]);
    });

    test('should return empty array in case of undefined field', () => {
      expect(getFieldsForTerms(undefined)).toEqual([]);
    });
  });

  describe('getMultiFieldLabel', () => {
    test('should return label for single field', () => {
      expect(
        getMultiFieldLabel(
          ['field'],
          [{ name: 'field', label: 'Label', type: KBN_FIELD_TYPES.DATE }]
        )
      ).toBe('Label');
    });

    test('should return label for multi fields', () => {
      expect(
        getMultiFieldLabel(
          ['field', 'field1'],
          [
            { name: 'field', label: 'Label', type: KBN_FIELD_TYPES.DATE },
            { name: 'field2', label: 'Label1', type: KBN_FIELD_TYPES.DATE },
          ]
        )
      ).toBe('Label + 1 other');
    });

    test('should return label for multi fields (2 others)', () => {
      expect(
        getMultiFieldLabel(
          ['field', 'field1', 'field2'],
          [
            { name: 'field', label: 'Label', type: KBN_FIELD_TYPES.DATE },
            { name: 'field1', label: 'Label1', type: KBN_FIELD_TYPES.DATE },
            { name: 'field3', label: 'Label2', type: KBN_FIELD_TYPES.DATE },
          ]
        )
      ).toBe('Label + 2 others');
    });
  });

  describe('createCachedTextFieldValueFormatter and createCachedReactFieldValueFormatter', () => {
    let dataView: DataView;
    let getFormatterForFieldSpy: jest.SpyInstance;

    beforeEach(() => {
      dataView = stubLogstashDataView;
      getFormatterForFieldSpy = jest.spyOn(dataView, 'getFormatterForField');
    });

    afterEach(() => {
      getFormatterForFieldSpy.mockRestore();
    });

    test('should use data view formatters and cache them', () => {
      const textCache = createCachedTextFieldValueFormatter(dataView);
      const reactCache = createCachedReactFieldValueFormatter(dataView);

      textCache('bytes', '10001');
      textCache('bytes', '20002');
      expect(getFormatterForFieldSpy).toHaveBeenCalledTimes(1);

      getFormatterForFieldSpy.mockClear();

      reactCache('bytes', '10001');
      reactCache('bytes', '20002');
      expect(getFormatterForFieldSpy).toHaveBeenCalledTimes(1);
    });

    test('should use default formatters in case of Data view not defined', () => {
      const textFieldFormatServiceMock = {
        getDefaultInstance: jest.fn().mockReturnValue(new StringFormat()),
      } as unknown as FieldFormatsRegistry;

      const reactFieldFormatServiceMock = {
        getDefaultInstance: jest.fn().mockReturnValue(new StringFormat()),
      } as unknown as FieldFormatsRegistry;

      const textCache = createCachedTextFieldValueFormatter(
        null,
        [{ name: 'field', label: 'Label', type: KBN_FIELD_TYPES.STRING }],
        textFieldFormatServiceMock
      );

      const reactCache = createCachedReactFieldValueFormatter(
        null,
        [{ name: 'field', label: 'Label', type: KBN_FIELD_TYPES.STRING }],
        reactFieldFormatServiceMock
      );

      textCache('field', '10001');
      textCache('field', '20002');
      expect(textFieldFormatServiceMock.getDefaultInstance).toHaveBeenCalledTimes(1);
      expect(textFieldFormatServiceMock.getDefaultInstance).toHaveBeenCalledWith('string');

      reactCache('field', '10001');
      reactCache('field', '20002');
      expect(reactFieldFormatServiceMock.getDefaultInstance).toHaveBeenCalledTimes(1);
      expect(reactFieldFormatServiceMock.getDefaultInstance).toHaveBeenCalledWith('string');
    });
  });
});
