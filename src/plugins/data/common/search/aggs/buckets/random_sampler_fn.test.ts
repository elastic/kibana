/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggRandomSampler } from './random_sampler_fn';

describe('aggRandomSampler', () => {
  const fn = functionWrapper(aggRandomSampler());

  test('includes params when they are provided', () => {
    const actual = fn({
      id: 'random_sampler',
      schema: 'bucket',
      probability: 0.1,
    });

    expect(actual.value).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "id": "random_sampler",
        "params": Object {
          "probability": 0.1,
        },
        "schema": "bucket",
        "type": "random_sampler",
      }
    `);
  });
});
