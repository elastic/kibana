/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IHttpFetchError } from '@kbn/core-http-browser';

export function createHttpFetchError<TResponseBody>(
  message: string,
  name: string = 'error',
  request = {} as Request,
  response?: Response,
  body?: TResponseBody
): IHttpFetchError {
  return Object.assign(new Error(message), {
    name,
    request,
    response,
    req: request,
    res: response,
    body,
  });
}
