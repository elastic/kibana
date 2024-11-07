/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BfetchRequestError } from '@kbn/bfetch-error';
import { ErrorLike } from '../batch';

export const normalizeError = <E extends ErrorLike = ErrorLike>(err: any): E => {
  if (!err) {
    return {
      message: 'Unknown error.',
    } as E;
  }
  if (err instanceof BfetchRequestError) {
    // ignoring so we can return the error as is
    // @ts-expect-error
    return err;
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
