/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getSelectedFields } from './group_fields';

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

  // it('excludes unmapped fields if useNewFieldsApi set to true', function () {
  //   const fieldsWithUnmappedField = [...fields];
  //   fieldsWithUnmappedField.push({
  //     name: 'unknown_field',
  //     type: 'unknown',
  //     esTypes: ['unknown'],
  //     count: 1,
  //     scripted: false,
  //     searchable: true,
  //     aggregatable: true,
  //     readFromDocValues: true,
  //   });
  //
  //   expect(
  //     (fieldsWithUnmappedField as DataViewField[]).filter((field) => shouldShowField(field, true))
  //       .length
  //   ).toBe(fieldsWithUnmappedField.length - 1);
  // });

  // it('includes unmapped fields when reading from source', function () {
  //   const fieldFilterState = getDefaultFieldFilter();
  //   const fieldsWithUnmappedField = [...fields];
  //   fieldsWithUnmappedField.push({
  //     name: 'unknown_field',
  //     type: 'unknown',
  //     esTypes: ['unknown'],
  //     count: 0,
  //     scripted: false,
  //     searchable: false,
  //     aggregatable: false,
  //     readFromDocValues: false,
  //   });
  //
  //   const actual = groupFields(
  //     fieldsWithUnmappedField as DataViewField[],
  //     ['customer_birth_date', 'currency'],
  //     5,
  //     fieldFilterState,
  //     false
  //   );
  //   expect(actual.unpopular.map((field) => field.name)).toEqual(['unknown_field']);
  // });
});
