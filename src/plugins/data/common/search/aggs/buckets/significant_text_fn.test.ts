/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggSignificantText } from './significant_text_fn';

describe('agg_expression_functions', () => {
  describe('aggSignificantText', () => {
    const fn = functionWrapper(aggSignificantText());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'machine.os',
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
              "field": "machine.os",
              "filter_duplicate_text": undefined,
              "include": undefined,
              "json": undefined,
              "min_doc_count": undefined,
              "size": undefined,
            },
            "schema": undefined,
            "type": "significant_text",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        id: '1',
        enabled: false,
        schema: 'whatever',
        field: 'machine.os',
        size: 6,
        include: 'win',
        exclude: 'ios',
        filter_duplicate_text: true,
        min_doc_count: 10,
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": false,
          "id": "1",
          "params": Object {
            "customLabel": undefined,
            "exclude": "ios",
            "field": "machine.os",
            "filter_duplicate_text": true,
            "include": "win",
            "json": undefined,
            "min_doc_count": 10,
            "size": 6,
          },
          "schema": "whatever",
          "type": "significant_text",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'machine.os',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
