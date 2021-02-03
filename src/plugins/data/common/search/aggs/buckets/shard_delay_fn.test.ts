/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggShardDelay } from './shard_delay_fn';

describe('agg_expression_functions', () => {
  describe('aggShardDelay', () => {
    const fn = functionWrapper(aggShardDelay());

    test('correctly serializes', () => {
      const actual = fn({
        delay: '1000ms',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "delay": "1000ms",
              "json": undefined,
            },
            "schema": undefined,
            "type": "shard_delay",
          },
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        delay: '1000ms',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
