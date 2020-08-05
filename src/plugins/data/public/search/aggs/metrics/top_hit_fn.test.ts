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

import { functionWrapper } from '../test_helpers';
import { aggTopHit } from './top_hit_fn';

describe('agg_expression_functions', () => {
  describe('aggTopHit', () => {
    const fn = functionWrapper(aggTopHit());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        aggregate: 'min',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "aggregate": "min",
              "customLabel": undefined,
              "field": "machine.os.keyword",
              "json": undefined,
              "size": undefined,
              "sortField": undefined,
              "sortOrder": undefined,
            },
            "schema": undefined,
            "type": "top_hits",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        id: '1',
        enabled: false,
        schema: 'whatever',
        field: 'machine.os.keyword',
        sortOrder: 'asc',
        size: 6,
        aggregate: 'min',
        sortField: '_score',
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": false,
          "id": "1",
          "params": Object {
            "aggregate": "min",
            "customLabel": undefined,
            "field": "machine.os.keyword",
            "json": undefined,
            "size": 6,
            "sortField": "_score",
            "sortOrder": "asc",
          },
          "schema": "whatever",
          "type": "top_hits",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        aggregate: 'min',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual({ foo: true });
      expect(() => {
        fn({
          field: 'machine.os.keyword',
          aggregate: 'min',
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
