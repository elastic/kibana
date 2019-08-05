/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Stream } from 'stream';
import { ResponseHeaders } from './headers';

/**
 * Additional metadata to enhance error output or provide error details.
 * @public
 */
export interface ResponseErrorMeta {
  data?: Record<string, any>;
  errorCode?: string;
  docLink?: string;
}
/**
 * Error message and optional data send to the client in case of error.
 * @public
 */
export type ResponseError =
  | string
  | Error
  | {
      message: string | Error;
      meta?: ResponseErrorMeta;
    };

/**
 * A response data object, expected to returned as a result of {@link RequestHandler} execution
 * @internal
 */
export class KibanaResponse<T extends HttpResponsePayload | ResponseError> {
  constructor(
    readonly status: number,
    readonly payload?: T,
    readonly options: HttpResponseOptions = {}
  ) {}
}

/**
 * HTTP response parameters
 * @public
 */
export interface HttpResponseOptions {
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
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
export interface CustomHttpResponseOptions extends HttpResponseOptions {
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
 * return response.ok(undefined);
 * return response.ok('ack');
 * return response.ok({ id: '1' });
 * return response.ok(Buffer.from(...););
 *
 * const stream = new Stream.PassThrough();
 * fs.createReadStream('./file').pipe(stream);
 * return res.ok(stream);
 * ```
 * HTTP headers are configurable via response factory parameter `options` {@link HttpResponseOptions}.
 *
 * ```js
 * return response.ok({ id: '1' }, {
 *   headers: {
 *     'content-type': 'application/json'
 *   }
 * });
 * ```
 * 2. Redirection response. Redirection URL is configures via 'Location' header.
 * ```js
 * return response.redirected('The document has moved', {
 *   headers: {
 *    location: '/new-url',
 *   },
 * });
 * ```
 * 3. Error response. You may pass an error message to the client, where error message can be:
 * - `string` send message text
 * - `Error` send the message text of given Error object.
 * - `{ message: string | Error, meta: {data: Record<string, any>, ...} }` - send message text and attach additional error metadata.
 * ```js
 * return response.unauthorized('User has no access to the requested resource.', {
 *   headers: {
 *     'WWW-Authenticate': 'challenge',
 *   }
 * })
 * return response.badRequest();
 * return response.badRequest('validation error');
 *
 * try {
 *   // ...
 * } catch(error){
 *   return response.badRequest(error);
 * }
 *
 * return response.badRequest({
 *   message: 'validation error',
 *   meta: {
 *     data: {
 *       requestBody: request.body,
 *       failedFields: validationResult
 *     },
 *   }
 * });
 *
 * try {
 *   // ...
 * } catch(error) {
 *   return response.badRequest({
 *     message: error,
 *     meta: {
 *       data: {
 *         requestBody: request.body,
 *       },
 *     }
 *   });
 * }
 *
 * ```
 * 4. Custom response. `ResponseFactory` may not cover your use case, so you can use the `custom` function to customize the response.
 * ```js
 * return response.custom('ok', {
 *   statusCode: 201,
 *   headers: {
 *     location: '/created-url'
 *   }
 * })
 * ```
 * @public
 */
export const kibanaResponseFactory = {
  // Success
  /**
   * The request has succeeded.
   * Status code: `200`.
   * @param payload - {@link HttpResponsePayload} payload to send to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  ok: (payload: HttpResponsePayload, options: HttpResponseOptions = {}) =>
    new KibanaResponse(200, payload, options),

  /**
   * The request has been accepted for processing.
   * Status code: `202`.
   * @param payload - {@link HttpResponsePayload} payload to send to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  accepted: (payload?: HttpResponsePayload, options: HttpResponseOptions = {}) =>
    new KibanaResponse(202, payload, options),

  /**
   * The server has successfully fulfilled the request and that there is no additional content to send in the response payload body.
   * Status code: `204`.
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  noContent: (options: HttpResponseOptions = {}) => new KibanaResponse(204, undefined, options),

  /**
   * Creates a response with defined status code and payload.
   * @param payload - {@link HttpResponsePayload} payload to send to the client
   * @param options - {@link CustomHttpResponseOptions} configures HTTP response parameters.
   */
  custom: (payload: HttpResponsePayload | ResponseError, options: CustomHttpResponseOptions) => {
    if (!options || !options.statusCode) {
      throw new Error(`options.statusCode is expected to be set. given options: ${options}`);
    }
    const { statusCode: code, ...rest } = options;
    return new KibanaResponse(code, payload, rest);
  },

  // Redirection
  /**
   * Redirect to a different URI.
   * Status code: `302`.
   * @param payload - payload to send to the client
   * @param options - {@link RedirectResponseOptions} configures HTTP response parameters.
   * Expects `location` header to be set.
   */
  redirected: (payload: HttpResponsePayload, options: RedirectResponseOptions) =>
    new KibanaResponse(302, payload, options),

  // Client error
  /**
   * The server cannot process the request due to something that is perceived to be a client error.
   * Status code: `400`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  badRequest: (error: ResponseError = 'Bad Request', options: HttpResponseOptions = {}) =>
    new KibanaResponse(400, error, options),

  /**
   * The request cannot be applied because it lacks valid authentication credentials for the target resource.
   * Status code: `401`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  unauthorized: (error: ResponseError = 'Unauthorized', options: HttpResponseOptions = {}) =>
    new KibanaResponse(401, error, options),

  /**
   * Server cannot grant access to a resource.
   * Status code: `403`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  forbidden: (error: ResponseError = 'Forbidden', options: HttpResponseOptions = {}) =>
    new KibanaResponse(403, error, options),

  /**
   * Server cannot find a current representation for the target resource.
   * Status code: `404`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  notFound: (error: ResponseError = 'Not Found', options: HttpResponseOptions = {}) =>
    new KibanaResponse(404, error, options),

  /**
   * The request could not be completed due to a conflict with the current state of the target resource.
   * Status code: `409`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  conflict: (error: ResponseError = 'Conflict', options: HttpResponseOptions = {}) =>
    new KibanaResponse(409, error, options),

  // Server error
  /**
   * The server encountered an unexpected condition that prevented it from fulfilling the request.
   * Status code: `500`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  internal: (error: ResponseError = 'Internal Error', options: HttpResponseOptions = {}) =>
    new KibanaResponse(500, error, options),
};

/**
 * Creates an object containing request response payload, HTTP headers, error details, and other data transmitted to the client.
 * @public
 */
export type KibanaResponseFactory = typeof kibanaResponseFactory;
