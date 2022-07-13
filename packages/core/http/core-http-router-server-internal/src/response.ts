/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Stream } from 'stream';
import type {
  IKibanaResponse,
  HttpResponsePayload,
  ResponseError,
  HttpResponseOptions,
  RedirectResponseOptions,
  CustomHttpResponseOptions,
  ErrorHttpResponseOptions,
  KibanaErrorResponseFactory,
  KibanaRedirectionResponseFactory,
  KibanaSuccessResponseFactory,
  KibanaResponseFactory,
  LifecycleResponseFactory,
} from '@kbn/core-http-server';

export function isKibanaResponse(response: Record<string, any>): response is IKibanaResponse {
  return typeof response.status === 'number' && typeof response.options === 'object';
}

/**
 * A response data object, expected to returned as a result of {@link RequestHandler} execution
 * @internal
 */
export class KibanaResponse<T extends HttpResponsePayload | ResponseError = any>
  implements IKibanaResponse<T>
{
  constructor(
    public readonly status: number,
    public readonly payload?: T,
    public readonly options: HttpResponseOptions = {}
  ) {}
}

const successResponseFactory: KibanaSuccessResponseFactory = {
  ok: (options: HttpResponseOptions = {}) => new KibanaResponse(200, options.body, options),
  accepted: (options: HttpResponseOptions = {}) => new KibanaResponse(202, options.body, options),
  noContent: (options: HttpResponseOptions = {}) => new KibanaResponse(204, undefined, options),
};

const redirectionResponseFactory: KibanaRedirectionResponseFactory = {
  redirected: (options: RedirectResponseOptions) => new KibanaResponse(302, options.body, options),
};

const errorResponseFactory: KibanaErrorResponseFactory = {
  badRequest: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(400, options.body || 'Bad Request', options),
  unauthorized: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(401, options.body || 'Unauthorized', options),
  forbidden: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(403, options.body || 'Forbidden', options),
  notFound: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(404, options.body || 'Not Found', options),
  conflict: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(409, options.body || 'Conflict', options),
  customError: (options: CustomHttpResponseOptions<ResponseError | Buffer | Stream>) => {
    if (!options || !options.statusCode) {
      throw new Error(
        `options.statusCode is expected to be set. given options: ${options && options.statusCode}`
      );
    }
    if (options.statusCode < 400 || options.statusCode >= 600) {
      throw new Error(
        `Unexpected Http status code. Expected from 400 to 599, but given: ${options.statusCode}`
      );
    }
    return new KibanaResponse(options.statusCode, options.body, options);
  },
};

export const kibanaResponseFactory: KibanaResponseFactory = {
  ...successResponseFactory,
  ...redirectionResponseFactory,
  ...errorResponseFactory,
  custom: <T extends HttpResponsePayload | ResponseError>(
    options: CustomHttpResponseOptions<T>
  ) => {
    if (!options || !options.statusCode) {
      throw new Error(
        `options.statusCode is expected to be set. given options: ${options && options.statusCode}`
      );
    }
    const { statusCode: code, body, ...rest } = options;
    return new KibanaResponse(code, body, { ...rest });
  },
};

export const lifecycleResponseFactory: LifecycleResponseFactory = {
  ...redirectionResponseFactory,
  ...errorResponseFactory,
};
