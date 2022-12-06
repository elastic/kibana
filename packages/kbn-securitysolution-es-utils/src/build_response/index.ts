/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomHttpResponseOptions, KibanaResponseFactory } from '@kbn/core/server';

const statusToErrorMessage = (
  statusCode: number
):
  | 'Bad Request'
  | 'Unauthorized'
  | 'Forbidden'
  | 'Not Found'
  | 'Conflict'
  | 'Internal Error'
  | '(unknown error)' => {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Error';
    default:
      return '(unknown error)';
  }
};

export class ResponseFactory {
  constructor(private response: KibanaResponseFactory) {}

  error<T>({ statusCode, body, headers }: CustomHttpResponseOptions<T>) {
    // KibanaResponse is not exported so we cannot use a return type here and that is why the linter is turned off above
    const contentType: CustomHttpResponseOptions<T>['headers'] = {
      'content-type': 'application/json',
    };
    const defaultedHeaders: CustomHttpResponseOptions<T>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      body: Buffer.from(
        JSON.stringify({
          message: body ?? statusToErrorMessage(statusCode),
          status_code: statusCode,
        })
      ),
      headers: defaultedHeaders,
      statusCode,
    });
  }
}

export const buildResponse = (response: KibanaResponseFactory): ResponseFactory =>
  new ResponseFactory(response);
