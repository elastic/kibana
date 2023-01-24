/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import { KibanaResponseFactory } from '@kbn/core/server';
import { KbnError } from '../common';

export class KbnServerError extends KbnError {
  public errBody?: Record<string, any>;
  constructor(message: string, public readonly statusCode: number, errBody?: Record<string, any>) {
    super(message);
    this.errBody = errBody;
  }
}

/**
 * Formats any error thrown into a standardized `KbnServerError`.
 * @param e `Error` or `ElasticsearchClientError`
 * @returns `KbnServerError`
 */
export function getKbnServerError(e: Error) {
  if (e instanceof KbnServerError) return e;
  return new KbnServerError(
    e.message ?? 'Unknown error',
    e instanceof errors.ResponseError ? e.statusCode! : 500,
    e instanceof errors.ResponseError ? e.body : undefined
  );
}

/**
 *
 * @param res Formats a `KbnServerError` into a server error response
 * @param err
 */
export function reportServerError(res: KibanaResponseFactory, err: KbnServerError) {
  return res.customError({
    statusCode: err.statusCode ?? 500,
    body: {
      message: err.message,
      attributes: err.errBody?.error,
    },
  });
}
