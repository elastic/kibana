/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggSampler } from './sampler_fn';

describe('aggSampler', () => {
  const fn = functionWrapper(aggSampler());

  test('fills in defaults when only required args are provided', () => {
    const actual = fn({ id: 'sampler', schema: 'bucket' });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "type": "agg_type",
        "value": Object {
          "enabled": true,
          "id": "sampler",
          "params": Object {
            "shard_size": undefined,
          },
          "schema": "bucket",
          "type": "sampler",
        },
      }
    `);
  });

  test('includes optional params when they are provided', () => {
    const actual = fn({
      id: 'sampler',
      schema: 'bucket',
      shard_size: 300,
    });

    expect(actual.value).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "id": "sampler",
        "params": Object {
          "shard_size": 300,
        },
        "schema": "bucket",
        "type": "sampler",
      }
    `);
  });
});
