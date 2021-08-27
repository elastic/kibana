/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEmptyArray } from '../../../validators/array/is_empty';
import { isEmptyString } from '../../../validators/string/is_empty';
import type { ValidationFunc } from '../../hook_form_lib/types';
import type { ERROR_CODE } from './types';

export const emptyField = (message: string) => (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value, path }] = args;

  if (typeof value === 'string') {
    return isEmptyString(value) ? { code: 'ERR_FIELD_MISSING', path, message } : undefined;
  }

  if (Array.isArray(value)) {
    return isEmptyArray(value) ? { code: 'ERR_FIELD_MISSING', path, message } : undefined;
  }
};
