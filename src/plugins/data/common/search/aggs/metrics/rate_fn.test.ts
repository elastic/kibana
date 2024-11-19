/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from '../test_helpers';
import { aggRate } from './rate_fn';

describe('agg_expression_functions', () => {
  describe('aggRate', () => {
    const fn = functionWrapper(aggRate());

    test('without field', () => {
      const actual = fn({
        unit: 'second',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": undefined,
              "json": undefined,
              "timeShift": undefined,
              "unit": "second",
            },
            "schema": undefined,
            "type": "rate",
          },
        }
      `);
    });

    test('with field', () => {
      const actual = fn({
        field: 'bytes',
        unit: 'second',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": "bytes",
              "json": undefined,
              "timeShift": undefined,
              "unit": "second",
            },
            "schema": undefined,
            "type": "rate",
          },
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        unit: 'month',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toMatchInlineSnapshot(`"{ \\"foo\\": true }"`);
    });
  });
});
