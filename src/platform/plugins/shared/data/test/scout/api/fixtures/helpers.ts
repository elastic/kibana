/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';

export function verifyErrorResponse(
  body: any,
  expectedCode: number,
  message?: string,
  shouldHaveAttrs?: boolean
) {
  expect(body.statusCode).toBe(expectedCode);
  if (message) {
    expect(body.message).toContain(message);
  }
  if (shouldHaveAttrs) {
    expect(body.attributes).toBeDefined();
    expect(body.attributes.error).toBeDefined();
    expect(body.attributes.error.root_cause).toBeDefined();
  } else {
    expect(body.attributes).toBeUndefined();
  }
}

export function shardDelayAgg(delay: string) {
  return {
    aggs: {
      delay: {
        shard_delay: {
          value: delay,
        },
      },
    },
  };
}

/**
 * A query clause that stalls every shard for the given number of seconds (SNAPSHOT builds only).
 * Useful for strategies that cannot use the `shard_delay` aggregation (e.g. SQL and EQL).
 */
export function stallQuery(seconds: number) {
  return {
    error_query: {
      indices: [{ name: '*', error_type: 'none', stall_time_seconds: seconds }],
    },
  };
}

/**
 * Polls a callback until it returns true or the timeout is reached.
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  opts: { timeout?: number; interval?: number } = {}
) {
  const { timeout = 15_000, interval = 2_000 } = opts;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms`);
}
