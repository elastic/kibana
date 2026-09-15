/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

const ABORT_ERROR_NAME = 'AbortError';
const ABORTED_REQUEST_MESSAGE = 'The user aborted a request.';
const NETWORK_REQUEST_FAILED_MESSAGE = 'Network request failed';

interface CaughtFetchError {
  name?: string;
  message?: string;
}

const getCaughtErrorName = (error: CaughtFetchError | string): string => {
  if (typeof error === 'string' || !error.name) {
    return 'Error';
  }
  return error.name;
};

const getCaughtErrorMessage = (error: CaughtFetchError | string): string => {
  if (typeof error === 'string') {
    return error;
  }
  return error.message ?? '';
};

const isAbortedFetchError = (
  error: CaughtFetchError | string,
  request: Request,
  emptyMessageMeansAbort: boolean
): boolean => {
  if (getCaughtErrorName(error) === ABORT_ERROR_NAME || request.signal?.aborted) {
    return true;
  }
  // Chromium cancels in-flight fetch during navigation with an empty Error/TypeError
  // instead of AbortError. See https://github.com/elastic/observability-error-backlog/issues/674
  return emptyMessageMeansAbort && !getCaughtErrorMessage(error);
};

const getFallbackFetchErrorMessage = (aborted: boolean, originalName: string): string => {
  if (aborted) {
    return ABORTED_REQUEST_MESSAGE;
  }
  if (originalName !== 'Error') {
    return originalName;
  }
  return NETWORK_REQUEST_FAILED_MESSAGE;
};

/**
 * Wraps a `window.fetch` or body-read failure, using a non-empty message and classifying aborts as `AbortError`.
 */
export const createHttpFetchErrorFromCause = (
  error: CaughtFetchError | string,
  request: Request,
  response?: Response,
  body?: any,
  emptyMessageMeansAbort = false
): HttpFetchError => {
  const aborted = isAbortedFetchError(error, request, emptyMessageMeansAbort);
  const originalMessage = getCaughtErrorMessage(error);
  const originalName = getCaughtErrorName(error);

  return new HttpFetchError(
    originalMessage || getFallbackFetchErrorMessage(aborted, originalName),
    aborted ? ABORT_ERROR_NAME : originalName,
    request,
    response,
    body
  );
};

/** @internal */
export class HttpFetchError extends Error implements IHttpFetchError {
  public readonly name: string;

  constructor(
    message: string,
    name: string,
    public readonly request: Request,
    public readonly response?: Response,
    public readonly body?: any
  ) {
    super(message);
    this.name = name;

    // captureStackTrace is only available in the V8 engine, so any browser using
    // a different JS engine won't have access to this method.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpFetchError);
    }
  }
}
