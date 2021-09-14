/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationFunc, ValidationError } from '../../hook_form_lib';
import { isNumberGreaterThan } from '../../../validators/number';
import { ERROR_CODE } from './types';

export const numberGreaterThanField = ({
  than,
  message,
  allowEquality = false,
}: {
  than: number;
  message: string | ((err: Partial<ValidationError>) => string);
  allowEquality?: boolean;
}) => (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value }] = args;

  return isNumberGreaterThan(than, allowEquality)(value as number)
    ? undefined
    : {
        code: 'ERR_GREATER_THAN_NUMBER',
        than,
        message: typeof message === 'function' ? message({ than }) : message,
      };
};
