/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpectOptions, ExpectOptionsOrMessage, Matchers } from './types';
import { createGenericMatchers } from './generic_matchers';
import { createResponseMatchers } from './response_matchers';
import { asymmetricMatchers } from './asymmetric_matchers';

/**
 * Normalize options parameter to ExpectOptions object.
 */
function normalizeOptions(options?: ExpectOptionsOrMessage): ExpectOptions | undefined {
  if (typeof options === 'string') {
    return { message: options };
  }
  return options;
}

/**
 * Custom expect wrapper for API tests with generic and response matchers.
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).toMatchObject({ body: { count: expect.toBeGreaterThan(0) } });
 * expect(value, 'Custom error message').toBeDefined();
 */
function expectFn(actual: unknown, options?: ExpectOptionsOrMessage): Matchers {
  const normalizedOptions = normalizeOptions(options);
  const genericMatchers = createGenericMatchers(actual, normalizedOptions);
  const responseMatchers = createResponseMatchers(actual, normalizedOptions);

  return {
    ...genericMatchers,
    ...responseMatchers,
    not: { ...genericMatchers.not },
  };
}

export const expect = Object.assign(expectFn, asymmetricMatchers);
