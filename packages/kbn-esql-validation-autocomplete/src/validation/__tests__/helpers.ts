/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EditorError, ESQLMessage, getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { ESQLCallbacks } from '../../shared/types';
import { getCallbackMocks } from '../../__tests__/helpers';
import { ValidationOptions } from '../types';
import { validateQuery } from '../validation';

export const setup = async () => {
  const callbacks = getCallbackMocks();

  const validate = async (
    query: string,
    opts: ValidationOptions = {},
    cb: ESQLCallbacks = callbacks
  ) => {
    return await validateQuery(query, getAstAndSyntaxErrors, opts, cb);
  };

  const expectErrors = async (
    query: string,
    expectedErrors: string[],
    opts: ValidationOptions = {},
    cb: ESQLCallbacks = callbacks
  ) => {
    const { errors } = await validateQuery(query, getAstAndSyntaxErrors, opts, cb);
    errors.sort((a: unknown, b: unknown) => String(a).localeCompare(String(b)));

    expect(errors.length).toBe(expectedErrors.length);

    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      if (error && typeof error === 'object') {
        const message =
          typeof (error as ESQLMessage).text === 'string'
            ? (error as ESQLMessage).text
            : (error as EditorError).message
            ? (error as EditorError).message
            : String(error);

        expect(message).toBe(expectedErrors[i]);
      } else {
        expect(String(error)).toBe(expectedErrors[i]);
      }
    }
  };

  return {
    callbacks,
    validate,
    expectErrors,
  };
};
