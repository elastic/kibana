/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CustomHttpResponseOptions,
  HttpResponseOptions,
  HttpResponsePayload,
  IKibanaResponse,
  RedirectResponseOptions,
  FileHttpResponseOptions,
  ResponseError,
  ErrorHttpResponseOptions,
} from './response';

/**
 * @public
 */
export interface KibanaSuccessResponseFactory {
  /**
   * The request has succeeded.
   * Status code: `200`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  ok<T extends HttpResponsePayload | ResponseError = any>(
    options?: HttpResponseOptions<T>
  ): IKibanaResponse<T>;

  /**
   * The request has succeeded and has led to the creation of a resource.
   * Status code: `201`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  created<T extends HttpResponsePayload | ResponseError = any>(
    options?: HttpResponseOptions<T>
  ): IKibanaResponse<T>;

  /**
   * The request has been accepted for processing.
   * Status code: `202`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  accepted<T extends HttpResponsePayload | ResponseError = any>(
    options?: HttpResponseOptions<T>
  ): IKibanaResponse<T>;

  /**
   * The server has successfully fulfilled the request and that there is no additional content to send in the response payload body.
   * Status code: `204`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  noContent(options?: HttpResponseOptions): IKibanaResponse;

  /**
   * The server indicates that there might be a mixture of responses (some tasks succeeded, some failed).
   * Status code: `207`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  multiStatus(options?: HttpResponseOptions): IKibanaResponse;
}

/**
 * @public
 */
export interface KibanaRedirectionResponseFactory {
  /**
   * Redirect to a different URI.
   * Status code: `302`.
   * @param options - {@link RedirectResponseOptions} configures HTTP response body & headers.
   * Expects `location` header to be set.
   */
  redirected(options: RedirectResponseOptions): IKibanaResponse;
}

/**
 * @public
 */
export interface KibanaNotModifiedResponseFactory {
  /**
   * Content not modified.
   * Status code: `304`.
   * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
   */
  notModified(options: HttpResponseOptions): IKibanaResponse;
}

/**
 * @public
 */
export interface KibanaErrorResponseFactory {
  /**
   * The server cannot process the request due to something that is perceived to be a client error.
   * Status code: `400`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  badRequest(options?: ErrorHttpResponseOptions): IKibanaResponse;

  /**
   * The request cannot be applied because it lacks valid authentication credentials for the target resource.
   * Status code: `401`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  unauthorized(options?: ErrorHttpResponseOptions): IKibanaResponse;

  /**
   * Server cannot grant access to a resource.
   * Status code: `403`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  forbidden(options?: ErrorHttpResponseOptions): IKibanaResponse;

  /**
   * Server cannot find a current representation for the target resource.
   * Status code: `404`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  notFound(options?: ErrorHttpResponseOptions): IKibanaResponse;

  /**
   * The request could not be completed due to a conflict with the current state of the target resource.
   * Status code: `409`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  conflict(options?: ErrorHttpResponseOptions): IKibanaResponse;

  /**
   * The server understands the content type of the request entity, and the syntax of the request entity is correct, but it was unable to process the contained instructions.
   * Status code: `422`.
   * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  unprocessableContent(options?: ErrorHttpResponseOptions): IKibanaResponse;

  /**
   * Creates an error response with defined status code and payload.
   * @param options - {@link CustomHttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
   */
  customError(options: CustomHttpResponseOptions<ResponseError>): IKibanaResponse;
}

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
export type KibanaResponseFactory = KibanaSuccessResponseFactory &
  KibanaRedirectionResponseFactory &
  KibanaNotModifiedResponseFactory &
  KibanaErrorResponseFactory & {
    /**
     * Creates a response with defined status code and payload.
     * @param options - {@link FileHttpResponseOptions} configures HTTP response parameters.
     */
    file<T extends HttpResponsePayload | ResponseError>(
      options: FileHttpResponseOptions<T>
    ): IKibanaResponse;
    /**
     * Creates a response with defined status code and payload.
     * @param options - {@link CustomHttpResponseOptions} configures HTTP response parameters.
     */
    custom<T extends HttpResponsePayload | ResponseError>(
      options: CustomHttpResponseOptions<T>
    ): IKibanaResponse;
  };

/**
 * Creates an object containing redirection or error response with error details, HTTP headers, and other data transmitted to the client.
 * @public
 */
export type LifecycleResponseFactory = KibanaRedirectionResponseFactory &
  KibanaErrorResponseFactory;
