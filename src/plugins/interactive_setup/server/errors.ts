/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';

/**
 * Extracts error code from Boom and Elasticsearch "native" errors.
 * @param error Error instance to extract status code from.
 */
export function getErrorStatusCode(error: any): number {
  if (error instanceof errors.ResponseError) {
    return error.statusCode!;
  }

  return error.statusCode || error.status;
}

/**
 * Extracts detailed error message from Boom and Elasticsearch "native" errors. It's supposed to be
 * only logged on the server side and never returned to the client as it may contain sensitive
 * information.
 * @param error Error instance to extract message from.
 */
export function getDetailedErrorMessage(error: any): string {
  if (error instanceof errors.ResponseError) {
    return JSON.stringify(error.body);
  }

  return error.message;
}
