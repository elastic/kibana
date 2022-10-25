/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSelectedFields } from './group_fields';
import { DataViewField } from '@kbn/data-views-plugin/public';

const fields = [
  {
    name: 'category',
    type: 'string',
    esTypes: ['text'],
    count: 1,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'currency',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'customer_birth_date',
    type: 'date',
    esTypes: ['date'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
];

describe('group_fields', function () {
  it('should pick fields into selected group', function () {
    const actual = getSelectedFields(fields as DataViewField[], ['currency']);
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "aggregatable": true,
          "count": 0,
          "esTypes": Array [
            "keyword",
          ],
          "name": "currency",
          "readFromDocValues": true,
          "scripted": false,
          "searchable": true,
          "type": "string",
        },
      ]
    `);
  });
  it('should pick fields into selected group if they contain multifields', function () {
    const category = {
      name: 'category',
      type: 'string',
      esTypes: ['text'],
      count: 1,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    };
    const currency = {
      name: 'currency',
      displayName: 'currency',
      kbnFieldType: {
        esTypes: ['string', 'text', 'keyword', '_type', '_id'],
        filterable: true,
        name: 'string',
        sortable: true,
      },
      spec: {
        esTypes: ['text'],
        name: 'category',
      },
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    };
    const currencyKeyword = {
      name: 'currency.keyword',
      displayName: 'currency.keyword',
      type: 'string',
      esTypes: ['keyword'],
      kbnFieldType: {
        esTypes: ['string', 'text', 'keyword', '_type', '_id'],
        filterable: true,
        name: 'string',
        sortable: true,
      },
      spec: {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'category.keyword',
        readFromDocValues: true,
        searchable: true,
        shortDotsEnable: false,
        subType: {
          multi: {
            parent: 'currency',
          },
        },
      },
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    };
    const fieldsToGroup = [category, currency, currencyKeyword] as DataViewField[];

    const actual = getSelectedFields(fieldsToGroup, ['currency', 'currency.keyword']);

    expect(actual).toEqual([currency, currencyKeyword]);
  });

  it('should sort selected fields by columns order ', function () {
    const actual1 = getSelectedFields(fields as DataViewField[], [
      'customer_birth_date',
      'currency',
      'unknown',
    ]);
    expect(actual1.map((field) => field.name)).toEqual([
      'customer_birth_date',
      'currency',
      'unknown',
    ]);

    const actual2 = getSelectedFields(fields as DataViewField[], [
      'currency',
      'customer_birth_date',
      'unknown',
    ]);
    expect(actual2.map((field) => field.name)).toEqual([
      'currency',
      'customer_birth_date',
      'unknown',
    ]);
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
