/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationFunc } from '../../hook_form_lib';
import { ERROR_CODE } from './types';

export const starCharacterCheck =
  (message: string) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;

    if (typeof value === 'string' && value.includes('*')) {
      return {
        code: 'ERR_STAR_CHARACTER',
        path,
        message,
      };
    }
    return undefined;
  };
