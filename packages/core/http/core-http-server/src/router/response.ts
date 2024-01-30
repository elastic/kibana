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
export interface HttpResponseOptions<T extends HttpResponsePayload | ResponseError = any> {
  /** HTTP message to send to the client */
  body?: T;
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
 * HTTP response parameters for a response with adjustable status code.
 * @public
 */
export interface FileHttpResponseOptions<T extends HttpResponsePayload | ResponseError> {
  /** Attachment content to send to the client */
  body: T;
  /** Attachment name, encoded and added to the headers to send to the client */
  filename: string;
  /** Explicitly set the attachment content type. Tries to detect the type based on extension and defaults to application/octet-stream */
  fileContentType?: string | null;
  /** Attachment content size in bytes, Tries to detect the content size from body */
  fileContentSize?: number;
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
  /** Bypass the default error formatting */
  bypassErrorFormat?: boolean;
  /** Bypass filename encoding, only set to true if the filename is already encoded */
  bypassFileNameEncoding?: boolean;
}

/**
 * HTTP response parameters for redirection response
 * @public
 */
export type RedirectResponseOptions = HttpResponseOptions & {
  headers?: ResponseHeaders;
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
