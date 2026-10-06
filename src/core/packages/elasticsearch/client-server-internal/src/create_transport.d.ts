/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transport } from '@elastic/elasticsearch';
import { type TransportRequestParams, type TransportRequestOptions } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalUnauthorizedErrorHandler } from './retry_unauthorized';
/**
 * Timing context stored in Transport request options for instrumentation
 * @internal
 */
export interface TimingContext {
  startTime: number;
  kibanaRequest: KibanaRequest;
}
/**
 * Extended context type for Transport request options
 * @internal
 */
export interface TransportContext {
  cpsRoutingContext?: any;
  timingContext?: TimingContext;
}
type TransportClass = typeof Transport;
export type ErrorHandlerAccessor = () => InternalUnauthorizedErrorHandler;
export interface OnRequestContext {
  scoped: boolean;
}
export type OnRequestHandler = (
  ctx: OnRequestContext,
  params: TransportRequestParams,
  options: TransportRequestOptions,
  logger: Logger
) => void;
/**
 * Options for Kibana's extended `asStream` flag.
 * Pass as `asStream: { retryOn401: true }` to opt in to automatic
 * 401 retry handling for streamed responses. KibanaTransport normalizes
 * the value to `asStream: true` before forwarding to `@elastic/transport`.
 */
export interface KibanaAsStreamOptions {
  /**
   * When true, the transport will intercept streamed 401 responses,
   * read the error body, refresh auth tokens via the unauthorized error handler,
   * and retry the request with updated credentials.
   * Without this flag, streamed 401 responses are returned as-is to the caller.
   */
  retryOn401?: boolean;
}
export declare const createTransport: ({
  scoped,
  getExecutionContext,
  getUnauthorizedErrorHandler,
  onRequest,
  logger,
}: {
  scoped?: boolean;
  getExecutionContext?: () => string | undefined;
  getUnauthorizedErrorHandler?: ErrorHandlerAccessor;
  onRequest: OnRequestHandler;
  logger: Logger;
}) => TransportClass;
export {};
