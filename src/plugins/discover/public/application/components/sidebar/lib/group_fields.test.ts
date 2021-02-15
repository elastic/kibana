/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupFields } from './group_fields';
import { getDefaultFieldFilter } from './field_filter';

describe('group_fields', function () {
  it('should group fields in selected, popular, unpopular group', function () {
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

    const fieldFilterState = getDefaultFieldFilter();

    const actual = groupFields(fields as any, ['currency'], 5, fieldCounts, fieldFilterState);
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
});
