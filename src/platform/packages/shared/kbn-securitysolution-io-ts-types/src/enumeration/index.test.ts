/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { left } from 'fp-ts/lib/Either';
import { enumeration } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('enumeration', () => {
  enum TestEnum {
    'test' = 'test',
  }

  it('should validate a string from the enum', () => {
    const input = TestEnum.test;
    const codec = enumeration('TestEnum', TestEnum);
    const decoded = codec.decode(input);
    const message = foldLeftRight(decoded);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(input);
  });

  it('should NOT validate a random string', () => {
    const input = 'some string';
    const codec = enumeration('TestEnum', TestEnum);
    const decoded = codec.decode(input);
    const message = foldLeftRight(decoded);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "TestEnum"',
    ]);
    expect(message.schema).toEqual({});
  });
});
