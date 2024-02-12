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
  FileHttpResponseOptions,
  ErrorHttpResponseOptions,
  KibanaErrorResponseFactory,
  KibanaRedirectionResponseFactory,
  KibanaNotModifiedResponseFactory,
  KibanaSuccessResponseFactory,
  KibanaResponseFactory,
  LifecycleResponseFactory,
} from '@kbn/core-http-server';
import mime from 'mime';

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

const notModifiedResponseFactory: KibanaNotModifiedResponseFactory = {
  notModified: (options: HttpResponseOptions = {}) => new KibanaResponse(304, undefined, options),
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

export const fileResponseFactory = {
  file: <T extends HttpResponsePayload | ResponseError>(options: FileHttpResponseOptions<T>) => {
    const {
      body,
      bypassErrorFormat,
      fileContentSize,
      headers,
      filename,
      fileContentType,
      bypassFileNameEncoding,
    } = options;
    const reponseFilename = bypassFileNameEncoding ? filename : encodeURIComponent(filename);
    const responseBody = typeof body === 'string' ? Buffer.from(body) : body;
    if (!responseBody) {
      throw new Error(`options.body is expected to be set.`);
    }

    const responseContentType =
      fileContentType ?? mime.getType(filename) ?? 'application/octet-stream';
    const responseContentLength =
      typeof fileContentSize === 'number'
        ? fileContentSize
        : Buffer.isBuffer(responseBody)
        ? responseBody.length
        : '';

    return new KibanaResponse(200, responseBody, {
      bypassErrorFormat,
      headers: {
        ...headers,
        'content-type': `${responseContentType}`,
        'content-length': `${responseContentLength}`,
        'content-disposition': `attachment; filename=${reponseFilename}`,
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
        'x-content-type-options': 'nosniff',
      },
    });
  },
};

export const kibanaResponseFactory: KibanaResponseFactory = {
  ...successResponseFactory,
  ...redirectionResponseFactory,
  ...notModifiedResponseFactory,
  ...errorResponseFactory,
  ...fileResponseFactory,
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
