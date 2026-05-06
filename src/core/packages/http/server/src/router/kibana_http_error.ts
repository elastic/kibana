/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseErrorAttributes } from './response';

function httpStatusToErrorLabel(statusCode: number): string {
  const labels: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return labels[statusCode] ?? 'Error';
}

export interface KibanaHttpErrorOutputPayload {
  statusCode: number;
  error: string;
  message: string;
  attributes?: ResponseErrorAttributes;
}

export interface KibanaHttpErrorOutput {
  statusCode: number;
  payload: KibanaHttpErrorOutputPayload;
  headers: { [key: string]: string };
}

export interface KibanaHttpErrorOptions {
  headers?: { [key: string]: string };
  data?: unknown;
  attributes?: ResponseErrorAttributes;
}

/**
 * Application HTTP error with the same wire shape as {@link https://hapi.dev/module/boom/ | Boom},
 * for gradual migration off `@hapi/boom`.
 *
 * @public
 */
export class KibanaHttpError extends Error {
  public readonly output: KibanaHttpErrorOutput;
  /** Optional arbitrary data (mirrors Boom `.data`) */
  public readonly data?: unknown;

  constructor(message: string, statusCode: number, options: KibanaHttpErrorOptions = {}) {
    super(message);
    this.name = 'KibanaHttpError';
    const label = httpStatusToErrorLabel(statusCode);
    const payload: KibanaHttpErrorOutputPayload = {
      statusCode,
      error: label,
      message,
    };
    if (options.attributes !== undefined) {
      payload.attributes = options.attributes;
    }
    this.output = {
      statusCode,
      payload,
      headers: (options.headers ?? {}) as { [key: string]: string },
    };
    this.data = options.data;
    Object.setPrototypeOf(this, KibanaHttpError.prototype);
  }
}

/** @public */
export function isKibanaHttpError(error: unknown): error is KibanaHttpError {
  return error instanceof KibanaHttpError;
}

/** @public */
export const KibanaHttpErrors = {
  badRequest: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 400, options),
  unauthorized: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 401, options),
  forbidden: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 403, options),
  notFound: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 404, options),
  conflict: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 409, options),
  tooManyRequests: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 429, options),
  internal: (message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, 500, options),
  custom: (statusCode: number, message: string, options?: KibanaHttpErrorOptions) =>
    new KibanaHttpError(message, statusCode, options),
};
