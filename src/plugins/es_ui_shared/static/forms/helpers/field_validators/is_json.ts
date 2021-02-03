/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ValidationFunc } from '../../hook_form_lib';
import { isJSON } from '../../../validators/string';
import { ERROR_CODE } from './types';

export const isJsonField = (
  message: string,
  { allowEmptyString = false }: { allowEmptyString?: boolean } = {}
) => (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value }] = args;

  if (typeof value !== 'string' || (allowEmptyString && value.trim() === '')) {
    return;
  }

  if (!isJSON(value)) {
    return {
      code: 'ERR_JSON_FORMAT',
      message,
    };
  }
};
