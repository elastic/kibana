/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Stream } from 'stream';
import type { ResponseHeaders } from './headers';

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
 * HTTP response options valid for file() responses
 * @public
 */
export type KibanaFileResponseOptions = Pick<HttpResponseOptions, 'headers'> & {
  /**
   * Set to true in order to enable caching for immutable URLs. This means that the
   * response for the current URL will never change and there isn't any point in the
   * user requesting the asset again, it should just be cached forever. Only do this
   * for URLs which include highly-specific information about the response, like hashes
   * or version numbers, as there is no way to clear that caches on user's machines
   */
  immutable?: boolean;
  /**
   * Specifies the method used to calculate the ETag header response. Defaults to 'hash'
   *
   * Available values:
   *  'hash' - SHA1 sum of the file contents, suitable for distributed deployments. Default value.
   *  false - Disable ETag computation.
   *
   */
  etagMethod?: 'hash' | false;
  /**
   * When specified, sends the file in "download" mode, which includes a filename for
   * the file to use by default and indicates to the user/browser that they should offer
   * this file for download/saving. The default value, undefined, sends the file in a
   * way that indicates the file should be rendered in the web browser and not saved locally.
   */
  download?: { filename: string };
};

/**
 * Data send to the client as a response payload.
 * @public
 */
export type HttpResponsePayload = undefined | string | Record<string, any> | Buffer | Stream;

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
