/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataViewField } from '@kbn/data-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getSelectedFields, shouldShowField, INITIAL_SELECTED_FIELDS_RESULT } from './group_fields';

describe('group_fields', function () {
  it('should pick fields as unknown_selected if they are unknown', function () {
    const actual = getSelectedFields({
      dataView,
      workspaceSelectedFieldNames: ['currency'],
      allFields: dataView.fields,
      searchMode: 'documents',
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
      workspaceSelectedFieldNames: ['nested1', 'bytes'],
      allFields: [
        {
          name: 'nested1',
          type: 'nested',
        },
      ] as DataViewField[],
      searchMode: 'documents',
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
      getSelectedFields({
        dataView,
        workspaceSelectedFieldNames: [],
        allFields: dataView.fields,
        searchMode: 'documents',
      })
    ).toBe(INITIAL_SELECTED_FIELDS_RESULT);
    expect(
      getSelectedFields({
        dataView,
        workspaceSelectedFieldNames: ['_source'],
        allFields: dataView.fields,
        searchMode: 'documents',
      })
    ).toBe(INITIAL_SELECTED_FIELDS_RESULT);
  });

  it('should pick fields into selected group', function () {
    const actual = getSelectedFields({
      dataView,
      workspaceSelectedFieldNames: ['bytes', '@timestamp'],
      allFields: dataView.fields,
      searchMode: 'documents',
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
      workspaceSelectedFieldNames: ['machine.os', 'machine.os.raw'],
      allFields: dataView.fields,
      searchMode: 'documents',
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
      workspaceSelectedFieldNames: ['bytes', 'extension.keyword', 'unknown'],
      allFields: dataView.fields,
      searchMode: 'documents',
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
      workspaceSelectedFieldNames: ['extension', 'bytes', 'unknown'],
      allFields: dataView.fields,
      searchMode: 'documents',
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
      workspaceSelectedFieldNames: ['bytes'],
      allFields: [
        {
          name: 'bytes',
          type: 'text',
        },
      ] as DataViewField[],
      searchMode: 'text-based',
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
    expect(shouldShowField(dataView.getFieldByName('bytes'), 'text-based', false)).toBe(true);
    expect(
      shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, 'text-based', false)
    ).toBe(true);
    expect(
      shouldShowField({ type: '_source', name: 'source' } as DataViewField, 'text-based', false)
    ).toBe(false);
  });

  it('should show fields excluding subfields', function () {
    expect(shouldShowField(dataView.getFieldByName('extension'), 'documents', false)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('extension.keyword'), 'documents', false)).toBe(
      false
    );
    expect(
      shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, 'documents', false)
    ).toBe(true);
    expect(
      shouldShowField({ type: '_source', name: 'source' } as DataViewField, 'documents', false)
    ).toBe(false);
  });

  it('should show fields including subfields', function () {
    expect(shouldShowField(dataView.getFieldByName('extension'), 'documents', true)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('extension.keyword'), 'documents', true)).toBe(
      true
    );
    expect(
      shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, 'documents', true)
    ).toBe(true);
    expect(
      shouldShowField({ type: '_source', name: 'source' } as DataViewField, 'documents', true)
    ).toBe(false);
  });
});
