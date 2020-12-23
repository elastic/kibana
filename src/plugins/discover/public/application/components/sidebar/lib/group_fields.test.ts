/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { groupFields } from './group_fields';
import { getDefaultFieldFilter } from './field_filter';
import { IndexPatternField } from '../../../../../../data/common/index_patterns/fields';

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
};

describe('group_fields', function () {
  it('should group fields in selected, popular, unpopular group', function () {
    const fieldFilterState = getDefaultFieldFilter();

    const actual = groupFields(
      fields as IndexPatternField[],
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
    const fieldsToGroup = [category, currency, currencyKeyword];

    const fieldFilterState = getDefaultFieldFilter();

    const actual = groupFields(
      fieldsToGroup as any,
      ['currency'],
      5,
      fieldCounts,
      fieldFilterState,
      true
    );
    expect(actual.popular).toEqual([category]);
    expect(actual.selected).toEqual([currency]);
    expect(actual.unpopular).toEqual([]);
  });

  it('should sort selected fields by columns order ', function () {
    const fieldFilterState = getDefaultFieldFilter();

    const actual1 = groupFields(
      fields as IndexPatternField[],
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
      fields as IndexPatternField[],
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
});
