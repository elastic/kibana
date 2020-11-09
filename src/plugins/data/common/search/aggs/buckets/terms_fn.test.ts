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
import { aggTerms } from './terms_fn';

describe('agg_expression_functions', () => {
  describe('aggTerms', () => {
    const fn = functionWrapper(aggTerms());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        orderBy: '1',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "exclude": undefined,
              "field": "machine.os.keyword",
              "include": undefined,
              "json": undefined,
              "missingBucket": undefined,
              "missingBucketLabel": undefined,
              "order": undefined,
              "orderAgg": undefined,
              "orderBy": "1",
              "otherBucket": undefined,
              "otherBucketLabel": undefined,
              "size": undefined,
            },
            "schema": undefined,
            "type": "terms",
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
        order: 'desc',
        orderBy: '2',
        size: 6,
        missingBucket: true,
        missingBucketLabel: 'missing',
        otherBucket: true,
        otherBucketLabel: 'other',
        include: 'win',
        exclude: 'ios',
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": false,
          "id": "1",
          "params": Object {
            "customLabel": undefined,
            "exclude": "ios",
            "field": "machine.os.keyword",
            "include": "win",
            "json": undefined,
            "missingBucket": true,
            "missingBucketLabel": "missing",
            "order": "desc",
            "orderAgg": undefined,
            "orderBy": "2",
            "otherBucket": true,
            "otherBucketLabel": "other",
            "size": 6,
          },
          "schema": "whatever",
          "type": "terms",
        }
      `);
    });

    test('handles orderAgg as a subexpression', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        order: 'asc',
        orderBy: '1',
        orderAgg: fn({ field: 'name', order: 'asc', orderBy: '1' }),
      });

      expect(actual.value.params).toMatchInlineSnapshot(`
        Object {
          "customLabel": undefined,
          "exclude": undefined,
          "field": "machine.os.keyword",
          "include": undefined,
          "json": undefined,
          "missingBucket": undefined,
          "missingBucketLabel": undefined,
          "order": "asc",
          "orderAgg": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "exclude": undefined,
              "field": "name",
              "include": undefined,
              "json": undefined,
              "missingBucket": undefined,
              "missingBucketLabel": undefined,
              "order": "asc",
              "orderAgg": undefined,
              "orderBy": "1",
              "otherBucket": undefined,
              "otherBucketLabel": undefined,
              "size": undefined,
            },
            "schema": undefined,
            "type": "terms",
          },
          "orderBy": "1",
          "otherBucket": undefined,
          "otherBucketLabel": undefined,
          "size": undefined,
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        order: 'asc',
        orderBy: '1',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual({ foo: true });
      expect(() => {
        fn({
          field: 'machine.os.keyword',
          order: 'asc',
          orderBy: '1',
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
