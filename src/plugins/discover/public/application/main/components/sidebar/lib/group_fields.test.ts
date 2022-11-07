/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getSelectedFields, shouldShowField } from './group_fields';

describe('group_fields', function () {
  it('should pick fields as unknown_selected if they are unknown', function () {
    const actual = getSelectedFields(dataView, ['currency']);
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "displayName": "currency",
          "name": "currency",
          "type": "unknown_selected",
        },
      ]
    `);
  });

  it('should pick fields into selected group', function () {
    const actual = getSelectedFields(dataView, ['bytes', '@timestamp']);
    expect(actual.map((field) => field.name)).toEqual(['bytes', '@timestamp']);
  });

  it('should pick fields into selected group if they contain multifields', function () {
    const actual = getSelectedFields(dataView, ['machine.os', 'machine.os.raw']);
    expect(actual.map((field) => field.name)).toEqual(['machine.os', 'machine.os.raw']);
  });

  it('should sort selected fields by columns order', function () {
    const actual1 = getSelectedFields(dataView, ['bytes', 'extension.keyword', 'unknown']);
    expect(actual1.map((field) => field.name)).toEqual(['bytes', 'extension.keyword', 'unknown']);

    const actual2 = getSelectedFields(dataView, ['extension', 'bytes', 'unknown']);
    expect(actual2.map((field) => field.name)).toEqual(['extension', 'bytes', 'unknown']);
  });

  it('should show any fields if for text-based searches', function () {
    expect(shouldShowField(dataView.getFieldByName('bytes'), true, true)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('bytes'), false, true)).toBe(true);
    expect(shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, true, true)).toBe(
      true
    );
    expect(
      shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, false, true)
    ).toBe(true);
    expect(shouldShowField({ type: '_source', name: 'source' } as DataViewField, false, true)).toBe(
      false
    );
  });

  it('should show any fields when searched from source', function () {
    expect(shouldShowField(dataView.getFieldByName('extension'), false, false)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('extension.keyword'), false, false)).toBe(true);
    expect(
      shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, false, false)
    ).toBe(true);
    expect(
      shouldShowField({ type: '_source', name: 'source' } as DataViewField, false, false)
    ).toBe(false);
  });

  it('should exclude multifields when fields api is used', function () {
    expect(shouldShowField(dataView.getFieldByName('extension'), true, false)).toBe(true);
    expect(shouldShowField(dataView.getFieldByName('extension.keyword'), true, false)).toBe(false);
    expect(
      shouldShowField({ type: 'unknown', name: 'unknown' } as DataViewField, true, false)
    ).toBe(true);
    expect(
      shouldShowField({ type: '_source', name: 'source' } as DataViewField, false, false)
    ).toBe(false);
  });
});
