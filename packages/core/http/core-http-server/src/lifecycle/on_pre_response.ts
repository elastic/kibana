/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ResponseHeaders, KibanaRequest } from '../router';

/**
 * @public
 */
export enum OnPreResponseResultType {
  render = 'render',
  next = 'next',
}

/**
 * @public
 */
export interface OnPreResponseResultRender {
  type: OnPreResponseResultType.render;
  body: string;
  headers?: ResponseHeaders;
}

/**
 * @public
 */
export interface OnPreResponseResultNext {
  type: OnPreResponseResultType.next;
  headers?: ResponseHeaders;
}

/**
 * @public
 */
export type OnPreResponseResult = OnPreResponseResultRender | OnPreResponseResultNext;

/**
 * Additional data to extend a response when rendering a new body
 * @public
 */
export interface OnPreResponseRender {
  /** additional headers to attach to the response */
  headers?: ResponseHeaders;
  /** the body to use in the response */
  body: string;
}

/**
 * Additional data to extend a response.
 * @public
 */
export interface OnPreResponseExtensions {
  /** additional headers to attach to the response */
  headers?: ResponseHeaders;
}

/**
 * Response status code.
 * @public
 */
export interface OnPreResponseInfo {
  statusCode: number;
}

/**
 * A tool set defining an outcome of OnPreResponse interceptor for incoming request.
 * @public
 */
export interface OnPreResponseToolkit {
  /** To override the response with a different body */
  render: (responseRender: OnPreResponseRender) => OnPreResponseResult;
  /** To pass request to the next handler */
  next: (responseExtensions?: OnPreResponseExtensions) => OnPreResponseResult;
}

/**
 * See {@link OnPreResponseToolkit}.
 * @public
 */
export type OnPreResponseHandler = (
  request: KibanaRequest,
  preResponse: OnPreResponseInfo,
  toolkit: OnPreResponseToolkit
) => OnPreResponseResult | Promise<OnPreResponseResult>;
