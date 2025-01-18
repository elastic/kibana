/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ValidationFuncArg } from '../../hook_form_lib';
import { emptyField } from './empty_field';

describe('emptyField', () => {
  const message = 'test error message';
  const code = 'ERR_FIELD_MISSING';
  const path = 'path';

  const validator = (value: string | any[], trimString?: boolean) =>
    emptyField(message, trimString)({ value, path } as ValidationFuncArg<any, any>);

  test('should return Validation function if value is an empty string and trimString is true', () => {
    expect(validator('')).toMatchObject({ message, code, path });
  });

  test('should return Validation function if value is an empty string and trimString is false', () => {
    expect(validator('', false)).toMatchObject({ message, code, path });
  });

  test('should return Validation function if value is a space and trimString is true', () => {
    expect(validator(' ')).toMatchObject({ message, code, path });
  });

  test('should return undefined if value is a space and trimString is false', () => {
    expect(validator(' ', false)).toBeUndefined();
  });

  test('should return undefined if value is a string and is not empty', () => {
    expect(validator('not Empty')).toBeUndefined();
  });

  test('should return undefined if value an array and is not empty', () => {
    expect(validator(['not Empty'])).toBeUndefined();
  });

  test('should return undefined if value an array and is empty', () => {
    expect(validator([])).toMatchObject({ message, code, path });
  });
});
