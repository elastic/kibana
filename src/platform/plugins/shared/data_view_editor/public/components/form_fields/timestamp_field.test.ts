/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { requireTimestampOptionValidator } from './timestamp_field';
import { TimestampOption } from '../../types';

const noOptions: TimestampOption[] = [];
const options: TimestampOption[] = [
  { display: 'a', fieldName: 'a' },
  { display: 'a', fieldName: 'b' },
];

describe('timestamp field validator', () => {
  test('no timestamp options - pass without value', async () => {
    const result = await requireTimestampOptionValidator(noOptions).validator({
      value: undefined,
    } as any);
    // no error
    expect(result).toBeUndefined();
  });
  test('timestamp options - fail without value', async () => {
    const result = await requireTimestampOptionValidator(options).validator({
      value: undefined,
    } as any);
    // returns error
    expect(result).toBeDefined();
  });
  test('timestamp options - pass with value', async () => {
    const result = await requireTimestampOptionValidator(options).validator({
      value: { label: 'a', value: 'a' },
    } as any);
    // no error
    expect(result).toBeUndefined();
  });
  test('timestamp options - fail, value not in list', async () => {
    const result = await requireTimestampOptionValidator(options).validator({
      value: { label: 'c', value: 'c' },
    } as any);
    // returns error
    expect(result).toBeDefined();
  });
});
