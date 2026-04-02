/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EndpointError } from './errors';

/**
 * Checks if an error object has HTTP response-like properties (e.g. from KbnClient or axios).
 */
const isHttpRequestError = (
  error: any
): error is Error & {
  config?: { method?: string; url?: string; data?: unknown };
  response?: { status?: number; statusText?: string; data?: any };
  status?: number;
} => {
  return error instanceof Error && ('response' in error || 'config' in error);
};

export class FormattedAxiosError extends EndpointError {
  public readonly request: {
    method: string;
    url: string;
    data: unknown;
  };
  public readonly response: {
    status: number;
    statusText: string;
    data: any;
  };

  constructor(httpError: Error & Record<string, any>) {
    const method = httpError.config?.method ?? '';
    const url = httpError.config?.url ?? '';
    const responseData = httpError.response?.data;

    super(
      `${httpError.message}${responseData ? `: ${JSON.stringify(responseData)}` : ''}${
        url ? `\n(Request: ${method} ${url})` : ''
      }`,
      httpError
    );

    this.request = {
      method,
      url,
      data: httpError.config?.data ?? '',
    };

    this.response = {
      status: httpError.response?.status ?? httpError.status ?? 0,
      statusText: httpError.response?.statusText ?? '',
      data: responseData,
    };

    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      message: this.message,
      request: this.request,
      response: this.response,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

/**
 * Used with `promise.catch()`, it will format the error to a new error and will re-throw.
 * If the error has HTTP request/response properties (e.g. from KbnClient), it will be
 * formatted as a `FormattedAxiosError` with request and response details.
 * @param error
 */
export const catchAxiosErrorFormatAndThrow = (error: Error): never => {
  if (isHttpRequestError(error)) {
    throw new FormattedAxiosError(error);
  }

  if (!(error instanceof EndpointError)) {
    throw new EndpointError(error.message, error);
  }

  throw error;
};
