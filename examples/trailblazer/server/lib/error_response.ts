/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { QueryParseError } from './build_query';

/** Maps query parse, saved object, and Elasticsearch errors to HTTP responses; rethrows anything else. */
export function toErrorResponse(response: KibanaResponseFactory, error: unknown): IKibanaResponse {
  if (error instanceof QueryParseError) {
    return response.badRequest({ body: { message: `Invalid query: ${error.message}` } });
  }
  if (isResponseError(error)) {
    return response.customError({
      statusCode: error.statusCode ?? 500,
      body: { message: error.message },
    });
  }
  if (error instanceof Error && SavedObjectsErrorHelpers.isSavedObjectsClientError(error)) {
    return response.customError({
      statusCode: error.output.statusCode,
      body: { message: error.message },
    });
  }
  throw error;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
