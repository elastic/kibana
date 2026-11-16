/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

export const isNotFoundError = (error: unknown): boolean =>
  isHttpFetchError(error) && error.response?.status === 404;

/** The server's explanation of a failed request, rather than the bare HTTP status text. */
export const getErrorMessage = (error: unknown): string => {
  const body = isHttpFetchError(error) ? error.body : undefined;
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }
  return error instanceof Error ? error.message : String(error);
};
