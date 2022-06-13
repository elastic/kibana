/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupFields } from './group_fields';
import { getDefaultFieldFilter } from './field_filter';
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

const fieldCounts = {
  category: 1,
  currency: 1,
  customer_birth_date: 1,
  unknown_field: 1,
};

describe('group_fields', function () {
  it('should group fields in selected, popular, unpopular group', function () {
    const fieldFilterState = getDefaultFieldFilter();

    const actual = groupFields(
      fields as DataViewField[],
      ['currency'],
      5,
      fieldCounts,
      fieldFilterState,
      false
    );
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "popular": Array [
          Object {
            "aggregatable": true,
            "count": 1,
            "esTypes": Array [
              "text",
            ],
            "name": "category",
            "readFromDocValues": true,
            "scripted": false,
            "searchable": true,
            "type": "string",
          },
        ],
        "selected": Array [
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
        ],
        "unpopular": Array [
          Object {
            "aggregatable": true,
            "count": 0,
            "esTypes": Array [
              "date",
            ],
            "name": "customer_birth_date",
            "readFromDocValues": true,
            "scripted": false,
            "searchable": true,
            "type": "date",
          },
        ],
      }
    `);
  });
  it('should group fields in selected, popular, unpopular group if they contain multifields', function () {
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

    const fieldFilterState = getDefaultFieldFilter();

    const actual = groupFields(fieldsToGroup, ['currency'], 5, fieldCounts, fieldFilterState, true);

    expect(actual.popular).toEqual([category]);
    expect(actual.selected).toEqual([currency]);
    expect(actual.unpopular).toEqual([]);
  });

  it('should sort selected fields by columns order ', function () {
    const fieldFilterState = getDefaultFieldFilter();

    const actual1 = groupFields(
      fields as DataViewField[],
      ['customer_birth_date', 'currency', 'unknown'],
      5,
      fieldCounts,
      fieldFilterState,
      false
    );
    expect(actual1.selected.map((field) => field.name)).toEqual([
      'customer_birth_date',
      'currency',
      'unknown',
    ]);

    const actual2 = groupFields(
      fields as DataViewField[],
      ['currency', 'customer_birth_date', 'unknown'],
      5,
      fieldCounts,
      fieldFilterState,
      false
    );
    expect(actual2.selected.map((field) => field.name)).toEqual([
      'currency',
      'customer_birth_date',
      'unknown',
    ]);
  });

  it('should filter fields by a given name', function () {
    const fieldFilterState = { ...getDefaultFieldFilter(), ...{ name: 'curr' } };

    const actual1 = groupFields(
      fields as DataViewField[],
      ['customer_birth_date', 'currency', 'unknown'],
      5,
      fieldCounts,
      fieldFilterState,
      false
    );
    expect(actual1.selected.map((field) => field.name)).toEqual(['currency']);
  });

  it('excludes unmapped fields if showUnmappedFields set to false', function () {
    const fieldFilterState = getDefaultFieldFilter();
    const fieldsWithUnmappedField = [...fields];
    fieldsWithUnmappedField.push({
      name: 'unknown_field',
      type: 'unknown',
      esTypes: ['unknown'],
      count: 1,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });

    const actual = groupFields(
      fieldsWithUnmappedField as DataViewField[],
      ['customer_birth_date', 'currency'],
      5,
      fieldCounts,
      fieldFilterState,
      true
    );
    expect(actual.unpopular).toEqual([]);
  });

  it('includes unmapped fields when reading from source', function () {
    const fieldFilterState = getDefaultFieldFilter();
    const fieldsWithUnmappedField = [...fields];
    fieldsWithUnmappedField.push({
      name: 'unknown_field',
      type: 'unknown',
      esTypes: ['unknown'],
      count: 0,
      scripted: false,
      searchable: false,
      aggregatable: false,
      readFromDocValues: false,
    });

    const actual = groupFields(
      fieldsWithUnmappedField as DataViewField[],
      ['customer_birth_date', 'currency'],
      5,
      fieldCounts,
      fieldFilterState,
      false
    );
    expect(actual.unpopular.map((field) => field.name)).toEqual(['unknown_field']);
  });
});
