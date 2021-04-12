/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';

export type UnauthorizedError = ResponseError & {
  statusCode: 401;
};

export function isResponseError(error: unknown): error is ResponseError {
  return error instanceof ResponseError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return isResponseError(error) && error.statusCode === 401;
}
