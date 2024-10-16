/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ValidationFuncArg } from '../../hook_form_lib';
import { isInteger } from './is_integer';

describe('isInteger', () => {
  const message = 'test';
  const code = 'ERR_NOT_INT_NUMBER';

  const validate = isInteger({ message });
  const validator = (value: number) => validate({ value } as ValidationFuncArg<any, any>);

  test('should return undefined if value is integer', () => {
    expect(validator(5)).toBeUndefined();
  });

  test('should return Validation function if value is not integer', () => {
    expect(validator(5.3)).toMatchObject({ message, code });
  });
});
