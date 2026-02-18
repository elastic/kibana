/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { SortOrder } from './sorting.gen';

describe('SortOrder schema', () => {
  it('accepts asc value', () => {
    const payload = 'asc';
    const result = SortOrder.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  it('accepts desc value', () => {
    const payload = 'desc';
    const result = SortOrder.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  it('fails on unknown value', () => {
    const payload = 'invalid';
    const result = SortOrder.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "Invalid enum value. Expected 'asc' | 'desc', received 'invalid'"
    );
  });
});
