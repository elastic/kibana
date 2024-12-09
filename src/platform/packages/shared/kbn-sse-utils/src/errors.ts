/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ServerSentEventBase, ServerSentEventType } from './events';

export enum ServerSentEventErrorCode {
  internalError = 'internalError',
  requestError = 'requestError',
}

export class ServerSentEventError<
  TCode extends string,
  TMeta extends Record<string, any> | undefined
> extends Error {
  constructor(public code: TCode, message: string, public meta: TMeta) {
    super(message);
  }

  toJSON(): ServerSentErrorEvent {
    return {
      type: ServerSentEventType.error,
      error: {
        code: this.code,
        message: this.message,
        meta: this.meta,
      },
    };
  }
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
  { status: number }
>;

export function createSSEInternalError(
  message: string = i18n.translate('sse.internalError', {
    defaultMessage: 'An internal error occurred',
  })
): ServerSentEventInternalError {
  return new ServerSentEventError(ServerSentEventErrorCode.internalError, message, {});
}

export function createSSERequestError(
  message: string,
  status: number
): ServerSentEventRequestError {
  return new ServerSentEventError(ServerSentEventErrorCode.requestError, message, {
    status,
  });
}

export function isSSEError(
  error: unknown
): error is ServerSentEventError<string, Record<string, any> | undefined> {
  return error instanceof ServerSentEventError;
}

export function isSSEInternalError(error: unknown): error is ServerSentEventInternalError {
  return isSSEError(error) && error.code === ServerSentEventErrorCode.internalError;
}

export function isSSERequestError(error: unknown): error is ServerSentEventRequestError {
  return isSSEError(error) && error.code === ServerSentEventErrorCode.requestError;
}
