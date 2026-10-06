/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerSentEventBase } from './events';
import type { ServerSentEventType } from './events';
export declare enum ServerSentEventErrorCode {
  internalError = 'internalError',
  requestError = 'requestError',
}
export declare class ServerSentEventError<
  TCode extends string,
  TMeta extends Record<string, any> | undefined
> extends Error {
  code: TCode;
  meta: TMeta;
  constructor(code: TCode, message: string, meta: TMeta);
  get status(): number | undefined;
  toJSON(): ServerSentErrorEvent;
}
export type ServerSentErrorEvent = ServerSentEventBase<
  ServerSentEventType.error,
  {
    error: {
      code: string;
      message: string;
      meta?: Record<string, any>;
    };
  }
>;
export type ServerSentEventInternalError = ServerSentEventError<
  ServerSentEventErrorCode.internalError,
  {}
>;
export type ServerSentEventRequestError = ServerSentEventError<
  ServerSentEventErrorCode.requestError,
  {
    status: number;
  }
>;
export declare function createSSEInternalError(message?: string): ServerSentEventInternalError;
export declare function createSSERequestError(
  message: string,
  status: number
): ServerSentEventRequestError;
export declare function isSSEError(
  error: unknown
): error is ServerSentEventError<string, Record<string, any> | undefined>;
export declare function isSSEInternalError(error: unknown): error is ServerSentEventInternalError;
export declare function isSSERequestError(error: unknown): error is ServerSentEventRequestError;
