/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ErrorLike } from '../batch';

export const normalizeError = <E extends ErrorLike = ErrorLike>(err: any): E => {
  if (!err) {
    return {
      message: 'Unknown error.',
    } as E;
  }
  if (err instanceof Error) {
    return { message: err.message } as E;
  }
  if (typeof err === 'object') {
    return {
      ...err,
      message: err.message || 'Unknown error.',
    } as E;
  }
  return {
    message: String(err),
  } as E;
};
