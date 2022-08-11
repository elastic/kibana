/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggSum } from './sum_fn';

describe('agg_expression_functions', () => {
  describe('aggSum', () => {
    const fn = functionWrapper(aggSum());

    test('required args are provided', () => {
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
              "emptyAsNull": undefined,
              "field": "machine.os.keyword",
              "json": undefined,
              "timeShift": undefined,
            },
            "schema": undefined,
            "type": "sum",
          },
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
