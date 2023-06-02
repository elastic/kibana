/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getSelectedFields, shouldShowField, INITIAL_SELECTED_FIELDS_RESULT } from './group_fields';

describe('group_fields', function () {
  it('should pick fields as unknown_selected if they are unknown', function () {
    const actual = getSelectedFields({
      dataView,
      columns: ['currency'],
      allFields: dataView.fields,
      isPlainRecord: false,
    });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "selectedFields": Array [
          Object {
            "displayName": "currency",
            "name": "currency",
            "type": "unknown_selected",
          },
        ],
        "selectedFieldsMap": Object {
          "currency": true,
        },
      }
    `);
  });

  it('should pick fields as nested for a nested field root', function () {
    const actual = getSelectedFields({
      dataView,
      columns: ['nested1', 'bytes'],
      allFields: [
        {
          name: 'nested1',
          type: 'nested',
        },
      ] as DataViewField[],
      isPlainRecord: false,
    });
    expect(actual.selectedFieldsMap).toMatchInlineSnapshot(`
      Object {
        "bytes": true,
        "nested1": true,
      }
    `);
  });

  it('should work correctly if no columns selected', function () {
    expect(
      getSelectedFields({ dataView, columns: [], allFields: dataView.fields, isPlainRecord: false })
    ).toBe(INITIAL_SELECTED_FIELDS_RESULT);
    expect(
      getSelectedFields({
        dataView,
        columns: ['_source'],
        allFields: dataView.fields,
        isPlainRecord: false,
      })
    ).toBe(INITIAL_SELECTED_FIELDS_RESULT);
  });

  it('should pick fields into selected group', function () {
    const actual = getSelectedFields({
      dataView,
      columns: ['bytes', '@timestamp'],
      allFields: dataView.fields,
      isPlainRecord: false,
    });
    expect(actual.selectedFields.map((field) => field.name)).toEqual(['bytes', '@timestamp']);
    expect(actual.selectedFieldsMap).toStrictEqual({
      bytes: true,
      '@timestamp': true,
    });
  });

  it('should pick fields into selected group if they contain multifields', function () {
    const actual = getSelectedFields({
      dataView,
      columns: ['machine.os', 'machine.os.raw'],
      allFields: dataView.fields,
      isPlainRecord: false,
    });
    expect(actual.selectedFields.map((field) => field.name)).toEqual([
      'machine.os',
      'machine.os.raw',
    ]);
    expect(actual.selectedFieldsMap).toStrictEqual({
      'machine.os': true,
      'machine.os.raw': true,
    });
  });

  it('should sort selected fields by columns order', function () {
    const actual1 = getSelectedFields({
      dataView,
      columns: ['bytes', 'extension.keyword', 'unknown'],
      allFields: dataView.fields,
      isPlainRecord: false,
    });
    expect(actual1.selectedFields.map((field) => field.name)).toEqual([
      'bytes',
      'extension.keyword',
      'unknown',
    ]);
    expect(actual1.selectedFieldsMap).toStrictEqual({
      bytes: true,
      'extension.keyword': true,
      unknown: true,
    });

    const actual2 = getSelectedFields({
      dataView,
      columns: ['extension', 'bytes', 'unknown'],
      allFields: dataView.fields,
      isPlainRecord: false,
    });
    expect(actual2.selectedFields.map((field) => field.name)).toEqual([
      'extension',
      'bytes',
      'unknown',
    ]);
    expect(actual2.selectedFieldsMap).toStrictEqual({
      extension: true,
      bytes: true,
      unknown: true,
    });
  });

  it('should pick fields only from allFields instead of data view fields for a text based query', function () {
    const actual = getSelectedFields({
      dataView,
      columns: ['bytes'],
      allFields: [
        {
          name: 'bytes',
          type: 'text',
        },
      ] as DataViewField[],
      isPlainRecord: true,
    });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "selectedFields": Array [
          Object {
            "name": "bytes",
            "type": "text",
          },
        ],
        "selectedFieldsMap": Object {
          "bytes": true,
        },
      }
    `);
  });

  it('should show any fields if for text-based searches', function () {
    expect(shouldShowField(dataView.getFieldByName('bytes'), true)).toBe(true);
    expect(shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, true)).toBe(true);
    expect(shouldShowField({ type: '_source', name: 'source' } as DataViewField, true)).toBe(false);
  });

  it('should show fields excluding subfields when searched from source', function () {
    expect(shouldShowField(dataView.getFieldByName('extension'), false)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('extension.keyword'), false)).toBe(false);
    expect(shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, false)).toBe(
      true
    );
    expect(shouldShowField({ type: '_source', name: 'source' } as DataViewField, false)).toBe(
      false
    );
  });

  it('should show fields excluding subfields when fields api is used', function () {
    expect(shouldShowField(dataView.getFieldByName('extension'), false)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('extension.keyword'), false)).toBe(false);
    expect(shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, false)).toBe(
      true
    );
    expect(shouldShowField({ type: '_source', name: 'source' } as DataViewField, false)).toBe(
      false
    );
  });
});
