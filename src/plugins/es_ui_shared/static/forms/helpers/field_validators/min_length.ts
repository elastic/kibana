/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hasMinLengthArray } from '../../../validators/array';
import { hasMinLengthString } from '../../../validators/string';
import { ValidationError, ValidationFunc } from '../../hook_form_lib';
import { ERROR_CODE } from './types';

export const minLengthField =
  ({
    length = 0,
    message,
  }: {
    length: number;
    message: string | ((err: Partial<ValidationError>) => string);
  }) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args;

    // Validate for Arrays
    if (Array.isArray(value)) {
      return hasMinLengthArray(length)(value)
        ? undefined
        : {
            code: 'ERR_MIN_LENGTH',
            length,
            message: typeof message === 'function' ? message({ length }) : message,
          };
    }

    // Validate for Strings
    return hasMinLengthString(length)((value as string).trim())
      ? undefined
      : {
          code: 'ERR_MIN_LENGTH',
          length,
          message: typeof message === 'function' ? message({ length }) : message,
        };
  };
