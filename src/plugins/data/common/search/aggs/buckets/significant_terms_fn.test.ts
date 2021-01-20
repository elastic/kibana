/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggSignificantTerms } from './significant_terms_fn';

describe('agg_expression_functions', () => {
  describe('aggSignificantTerms', () => {
    const fn = functionWrapper(aggSignificantTerms());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'machine.os.keyword',
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
              "size": undefined,
            },
            "schema": undefined,
            "type": "significant_terms",
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
        size: 6,
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
            "size": 6,
          },
          "schema": "whatever",
          "type": "significant_terms",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
