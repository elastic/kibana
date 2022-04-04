/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggCount } from './count_fn';

describe('agg_expression_functions', () => {
  describe('aggCount', () => {
    const fn = functionWrapper(aggCount());

    test('correctly creates agg type', () => {
      const actual = fn({});
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "emptyAsNull": undefined,
              "timeShift": undefined,
            },
            "schema": undefined,
            "type": "count",
          },
        }
      `);
    });
  });
});
