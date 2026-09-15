/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterFn, Payload } from './ebt_span_filter';

const ABORT_ERROR_NAME = 'AbortError';
const EMPTY_UNHANDLED_REJECTION = /^Unhandled promise rejection: Error:\s*$/;
const ABORTED_REQUEST_MESSAGE = /The user aborted a request|signal is aborted without reason/i;

const isAbortedRequestTelemetryError = (error: Record<string, any>): boolean => {
  const exception = error?.exception;
  const type = exception?.type;
  const message = exception?.message ?? error?.log?.message ?? '';

  if (type === ABORT_ERROR_NAME) {
    return true;
  }

  if (typeof message !== 'string' || !message) {
    return false;
  }

  return EMPTY_UNHANDLED_REJECTION.test(message) || ABORTED_REQUEST_MESSAGE.test(message);
};

/**
 * Drops cancelled/aborted HTTP fetch errors so navigation noise is not reported to APM RUM.
 */
export const abortedRequestErrorFilter: FilterFn = (payload: Payload) => {
  try {
    if (payload.errors) {
      payload.errors = payload.errors.filter(
        (error: Record<string, any>) => !isAbortedRequestTelemetryError(error)
      );
    }
  } catch {
    // Keep the payload if the filter fails.
  }

  return payload;
};
