/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Stream } from 'stream';
import { ResponseHeaders } from './headers';

/**
 * Additional data to provide error details.
 * @public
 */
export type ResponseErrorAttributes = Record<string, any>;
/**
 * Error message and optional data send to the client in case of error.
 * @public
 */
export type ResponseError =
  | string
  | Error
  | {
      message: string | Error;
      attributes?: ResponseErrorAttributes;
    };

/**
 * A response data object, expected to returned as a result of {@link RequestHandler} execution
 * @public
 */
export interface IKibanaResponse<T extends HttpResponsePayload | ResponseError = any> {
  readonly status: number;
  readonly payload?: T;
  readonly options: HttpResponseOptions;
}

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

/**
 * HTTP response parameters
 * @public
 */
export interface HttpResponseOptions {
  /** HTTP message to send to the client */
  body?: HttpResponsePayload;
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
  /** Bypass the default error formatting */
  bypassErrorFormat?: boolean;
}

/**
 * Data send to the client as a response payload.
 * @public
 */
export type HttpResponsePayload = undefined | string | Record<string, any> | Buffer | Stream;

/**
 * HTTP response parameters for a response with adjustable status code.
 * @public
 */
export interface CustomHttpResponseOptions<T extends HttpResponsePayload | ResponseError> {
  /** HTTP message to send to the client */
  body?: T;
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
  /** Bypass the default error formatting */
  bypassErrorFormat?: boolean;
  statusCode: number;
}

/**
 * HTTP response parameters for redirection response
 * @public
 */
export type RedirectResponseOptions = HttpResponseOptions & {
  headers: {
    location: string;
  };
};

/**
 * HTTP response parameters
 * @public
 */
export interface ErrorHttpResponseOptions {
  /** HTTP message to send to the client */
  body?: ResponseError;
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
}

const successResponseFactory = {
  /**
   * The request has succeeded.
   * Status code: `200`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  ok: (options: HttpResponseOptions = {}) => new KibanaResponse(200, options.body, options),

  /**
   * The request has been accepted for processing.
   * Status code: `202`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  accepted: (options: HttpResponseOptions = {}) => new KibanaResponse(202, options.body, options),

  /**
   * The server has successfully fulfilled the request and that there is no additional content to send in the response payload body.
   * Status code: `204`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  noContent: (options: HttpResponseOptions = {}) => new KibanaResponse(204, undefined, options),
};

const redirectionResponseFactory = {
  /**
   * Redirect to a different URI.
   * Status code: `302`.
   * @param options - {@link RedirectResponseOptions} configures HTTP response body & headers.
   * Expects `location` header to be set.
   */
  redirected: (options: RedirectResponseOptions) => new KibanaResponse(302, options.body, options),
};

const errorResponseFactory = {
  /**
   * The server cannot process the request due to something that is perceived to be a client error.
   * Status code: `400`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  badRequest: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(400, options.body || 'Bad Request', options),

  /**
   * The request cannot be applied because it lacks valid authentication credentials for the target resource.
   * Status code: `401`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  unauthorized: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(401, options.body || 'Unauthorized', options),

  /**
   * Server cannot grant access to a resource.
   * Status code: `403`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  forbidden: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(403, options.body || 'Forbidden', options),

  /**
   * Server cannot find a current representation for the target resource.
   * Status code: `404`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  notFound: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(404, options.body || 'Not Found', options),

  /**
   * The request could not be completed due to a conflict with the current state of the target resource.
   * Status code: `409`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  conflict: (options: ErrorHttpResponseOptions = {}) =>
    new KibanaResponse(409, options.body || 'Conflict', options),

  /**
   * Creates an error response with defined status code and payload.
   * @param options - {@link CustomHttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
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
/**
 * Set of helpers used to create `KibanaResponse` to form HTTP response on an incoming request.
 * Should be returned as a result of {@link RequestHandler} execution.
 *
 * @example
 * 1. Successful response. Supported types of response body are:
 * - `undefined`, no content to send.
 * - `string`, send text
 * - `JSON`, send JSON object, HTTP server will throw if given object is not valid (has circular references, for example)
 * - `Stream` send data stream
 * - `Buffer` send binary stream
 * ```js
 * return response.ok();
 * return response.ok({ body: 'ack' });
 * return response.ok({ body: { id: '1' } });
 * return response.ok({ body: Buffer.from(...) });
 *
 * const stream = new Stream.PassThrough();
 * fs.createReadStream('./file').pipe(stream);
 * return res.ok({ body: stream });
 * ```
 * HTTP headers are configurable via response factory parameter `options` {@link HttpResponseOptions}.
 *
 * ```js
 * return response.ok({
 *   body: { id: '1' },
 *   headers: {
 *     'content-type': 'application/json'
 *   }
 * });
 * ```
 * 2. Redirection response. Redirection URL is configures via 'Location' header.
 * ```js
 * return response.redirected({
 *   body: 'The document has moved',
 *   headers: {
 *    location: '/new-url',
 *   },
 * });
 * ```
 * 3. Error response. You may pass an error message to the client, where error message can be:
 * - `string` send message text
 * - `Error` send the message text of given Error object.
 * - `{ message: string | Error, attributes: {data: Record<string, any>, ...} }` - send message text and attach additional error data.
 * ```js
 * return response.unauthorized({
 *   body: 'User has no access to the requested resource.',
 *   headers: {
 *     'WWW-Authenticate': 'challenge',
 *   }
 * })
 * return response.badRequest();
 * return response.badRequest({ body: 'validation error' });
 *
 * try {
 *   // ...
 * } catch(error){
 *   return response.badRequest({ body: error });
 * }
 *
 * return response.badRequest({
 *  body:{
 *    message: 'validation error',
 *    attributes: {
 *      requestBody: request.body,
 *      failedFields: validationResult
 *    }
 *  }
 * });
 *
 * try {
 *   // ...
 * } catch(error) {
 *   return response.badRequest({
 *     body: error
 *   });
 * }
 *
 * ```
 * 4. Custom response. `ResponseFactory` may not cover your use case, so you can use the `custom` function to customize the response.
 * ```js
 * return response.custom({
 *   body: 'ok',
 *   statusCode: 201,
 *   headers: {
 *     location: '/created-url'
 *   }
 * })
 * ```
 * @public
 */
export const kibanaResponseFactory = {
  ...successResponseFactory,
  ...redirectionResponseFactory,
  ...errorResponseFactory,
  /**
   * Creates a response with defined status code and payload.
   * @param options - {@link CustomHttpResponseOptions} configures HTTP response parameters.
   */
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

export const lifecycleResponseFactory = {
  ...redirectionResponseFactory,
  ...errorResponseFactory,
};

/**
 * Creates an object containing request response payload, HTTP headers, error details, and other data transmitted to the client.
 * @public
 */
export type KibanaResponseFactory = typeof kibanaResponseFactory;

/**
 * Creates an object containing redirection or error response with error details, HTTP headers, and other data transmitted to the client.
 * @public
 */
export type LifecycleResponseFactory = typeof lifecycleResponseFactory;
