/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ErrorWithCode } from './error_with_code';

describe('ErrorWithCode', () => {
  const error = new ErrorWithCode('test', 'test_code');
  test('message and code properties are publicly accessible', () => {
    expect(error.message).toBe('test');
    expect(error.code).toBe('test_code');
  });
  test('extends error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});
