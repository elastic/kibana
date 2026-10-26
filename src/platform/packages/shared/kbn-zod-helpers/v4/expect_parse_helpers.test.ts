/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { expectParseSuccess } from './expect_parse_success';
import { expectParseError } from './expect_parse_error';

describe('expectParseSuccess', () => {
  const schema = z.string();

  it('does not throw for a successful parse result', () => {
    const result = schema.safeParse('hello');
    expect(() => expectParseSuccess(result)).not.toThrow();
  });

  it('throws for a failed parse result', () => {
    const result = schema.safeParse(123);
    expect(() => expectParseSuccess(result)).toThrow('Expected parse success');
  });
});

describe('expectParseError', () => {
  const schema = z.string();

  it('passes for a failed parse result', () => {
    const result = schema.safeParse(123);
    expectParseError(result);
  });
});
