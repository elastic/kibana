/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueError } from '..';

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

export type ErrorLike = SerializedError & {
  original?: SerializedError;
};

export const createError = (err: string | ErrorLike): ExpressionValueError => ({
  type: 'error',
  error: {
    stack:
      process.env.NODE_ENV === 'production'
        ? undefined
        : typeof err === 'object'
        ? err.stack
        : undefined,
    message: typeof err === 'string' ? err : String(err.message),
    name: typeof err === 'object' ? err.name || 'Error' : 'Error',
    original:
      err instanceof Error
        ? err
        : typeof err === 'object' && 'original' in err && err.original instanceof Error
        ? err.original
        : undefined,
  },
});
