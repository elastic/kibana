/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { paramIsValid } from '.';
import { getField } from '../fields/index.mock';
import * as i18n from '../translations';
import moment from 'moment';

describe('params_is_valid', () => {
  beforeEach(() => {
    // Disable momentJS deprecation warning and it looks like it is not typed either so
    // we have to disable the type as well and cannot extend it easily.
    (
      moment as unknown as {
        suppressDeprecationWarnings: boolean;
      }
    ).suppressDeprecationWarnings = true;
  });

  afterEach(() => {
    // Re-enable momentJS deprecation warning and it looks like it is not typed either so
    // we have to disable the type as well and cannot extend it easily.
    (
      moment as unknown as {
        suppressDeprecationWarnings: boolean;
      }
    ).suppressDeprecationWarnings = false;
  });

  test('returns no errors if no field has been selected', () => {
    const isValid = paramIsValid('', undefined, true, false);

    expect(isValid).toBeUndefined();
  });

  test('returns error string if user has touched a required input and left empty', () => {
    const isValid = paramIsValid(undefined, getField('@timestamp'), true, true);

    expect(isValid).toEqual(i18n.FIELD_REQUIRED_ERR);
  });

  test('returns no errors if required input is empty but user has not yet touched it', () => {
    const isValid = paramIsValid(undefined, getField('@timestamp'), true, false);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if user has touched an input that is not required and left empty', () => {
    const isValid = paramIsValid(undefined, getField('@timestamp'), false, true);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if user has touched an input that is not required and left empty string', () => {
    const isValid = paramIsValid('', getField('@timestamp'), false, true);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if field is of type date and value is valid', () => {
    const isValid = paramIsValid('1994-11-05T08:15:30-05:00', getField('@timestamp'), false, true);

    expect(isValid).toBeUndefined();
  });

  test('returns errors if filed is of type date and value is not valid', () => {
    const isValid = paramIsValid('1593478826', getField('@timestamp'), false, true);

    expect(isValid).toEqual(i18n.DATE_ERR);
  });

  test('returns no errors if field is of type number and value is an integer', () => {
    const isValid = paramIsValid('4', getField('bytes'), true, true);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if field is of type number and value is a float', () => {
    const isValid = paramIsValid('4.3', getField('bytes'), true, true);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if field is of type number and value is a long', () => {
    const isValid = paramIsValid('-9223372036854775808', getField('bytes'), true, true);

    expect(isValid).toBeUndefined();
  });

  test('returns errors if field is of type number and value is "hello"', () => {
    const isValid = paramIsValid('hello', getField('bytes'), true, true);

    expect(isValid).toEqual(i18n.NUMBER_ERR);
  });

  test('returns errors if field is of type number and value is "123abc"', () => {
    const isValid = paramIsValid('123abc', getField('bytes'), true, true);

    expect(isValid).toEqual(i18n.NUMBER_ERR);
  });
});
