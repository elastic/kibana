/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';

/** @public */
export type UnauthorizedError = errors.ResponseError & {
  statusCode: 401;
};

export function isResponseError(error: unknown): error is errors.ResponseError {
  return error instanceof errors.ResponseError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return isResponseError(error) && error.statusCode === 401;
}
