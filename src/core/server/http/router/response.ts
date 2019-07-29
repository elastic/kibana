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
import { IncomingHttpHeaders } from 'http';
import { Stream } from 'stream';

import { ResponseError } from './response_error';

export class KibanaResponse<T extends HttpResponsePayload | ResponseError> {
  constructor(
    readonly status: number,
    readonly payload?: T,
    readonly options: HttpResponseOptions = {}
  ) {}
}

/**
 * Creates a Union type of all known keys of a given interface.
 * @example
 * ```ts
 * interface Person {
 *   name: string;
 *   age: number;
 *   [attributes: string]: string | number;
 * }
 * type PersonKnownKeys = KnownKeys<Person>; // "age" | "name"
 * ```
 */
type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends { [_ in keyof T]: infer U }
  ? U
  : never;

type KnownHeaders = KnownKeys<IncomingHttpHeaders>;
/**
 * HTTP response parameters
 * @public
 */
export interface HttpResponseOptions {
  /** HTTP Headers with additional information about response */
  headers?: { [header in KnownHeaders]?: string | string[] } & {
    [header: string]: string | string[];
  };
}

/**
 * @public
 */
export type HttpResponsePayload = undefined | string | Record<string, any> | Buffer | Stream;

/**
 * HTTP response parameters
 * @public
 */
export interface CustomResponseOptions extends HttpResponseOptions {
  statusCode: number;
}

/**
 * HTTP response parameters
 * @public
 */
export type RedirectResponseOptions = HttpResponseOptions & {
  headers: {
    location: string;
  };
};

export const responseFactory = {
  // Success
  /**
   * The request has succeeded.
   * Status code: `200`.
   * @param payload - {@link HttpResponsePayload} payload to send to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  ok: <T extends HttpResponsePayload>(payload: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(200, payload, options),

  /**
   * The request has been accepted for processing.
   * Status code: `202`.
   * @param payload - {@link HttpResponsePayload} payload to send to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  accepted: <T extends HttpResponsePayload>(payload?: T, options: HttpResponseOptions = {}) =>
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
   * @param options - {@link CustomResponseOptions} configures HTTP response parameters.
   */
  custom: <T extends HttpResponsePayload | ResponseError>(
    payload: T,
    options: CustomResponseOptions
  ) => {
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
  redirected: <T extends HttpResponsePayload>(payload: T, options: RedirectResponseOptions) =>
    new KibanaResponse(302, payload, options),

  // Client error
  /**
   * The server cannot process the request due to something that is perceived to be a client error.
   * Status code: `400`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  badRequest: <T extends ResponseError>(error: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(400, error, options),

  /**
   * The request cannot be applied because it lacks valid authentication credentials for the target resource.
   * Status code: `401`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  unauthorized: <T extends ResponseError>(error: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(401, error, options),

  /**
   * Server cannot grant access to a resource.
   * Status code: `403`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  forbidden: <T extends ResponseError>(error: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(403, error, options),

  /**
   * Server cannot find a current representation for the target resource.
   * Status code: `404`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  notFound: <T extends ResponseError>(error: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(404, error, options),

  /**
   * The request could not be completed due to a conflict with the current state of the target resource.
   * Status code: `409`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  conflict: <T extends ResponseError>(error: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(409, error, options),

  // Server error
  /**
   * The server encountered an unexpected condition that prevented it from fulfilling the request.
   * Status code: `500`.
   * @param error - {@link ResponseError} Error object containing message and other error details to pass to the client
   * @param options - {@link HttpResponseOptions} configures HTTP response parameters.
   */
  internal: <T extends ResponseError>(error: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(500, error, options),
};

/**
 * Creates an object containing request response payload, HTTP headers, error details, and other data transmitted to the client.
 * @public
 */
export type ResponseFactory = typeof responseFactory;
