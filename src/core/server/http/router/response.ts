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

type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends { [_ in keyof T]: infer U }
  ? U
  : never;

type KnownHeaders = KnownKeys<IncomingHttpHeaders>;
/**
 * @public
 */
export interface HttpResponseOptions {
  headers?: { [header in KnownHeaders]?: string | string[] } & {
    [header: string]: string | string[];
  };
}

/**
 * @public
 */
export type HttpResponsePayload = undefined | string | Record<string, any> | Buffer | Stream;

/**
 * @public
 */
export interface CustomResponseOptions extends HttpResponseOptions {
  statusCode: number;
}

export const responseFactory = {
  // Success
  ok: <T extends HttpResponsePayload>(payload: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(200, payload, options),
  accepted: <T extends HttpResponsePayload>(payload?: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(202, payload, options),
  noContent: (options: HttpResponseOptions = {}) => new KibanaResponse(204, undefined, options),

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
  redirected: (url: string, options: HttpResponseOptions = {}) =>
    new KibanaResponse(302, url, options),

  // Client error
  badRequest: <T extends ResponseError>(err: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(400, err, options),
  unauthorized: <T extends ResponseError>(err: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(401, err, options),

  forbidden: <T extends ResponseError>(err: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(403, err, options),
  notFound: <T extends ResponseError>(err: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(404, err, options),
  conflict: <T extends ResponseError>(err: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(409, err, options),

  // Server error
  internal: <T extends ResponseError>(err: T, options: HttpResponseOptions = {}) =>
    new KibanaResponse(500, err, options),
};

/**
 * @public
 */
export type ResponseFactory = typeof responseFactory;
