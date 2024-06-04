/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import { errors } from '@elastic/elasticsearch';
import { KibanaResponseFactory } from '@kbn/core/server';
import { KbnError } from '@kbn/kibana-utils-plugin/common';
import type { SanitizedConnectionRequestParams } from '@kbn/search-types';
import { sanitizeRequestParams } from '../../common/search/sanitize_request_params';

// Why not use just use kibana-utils-plugin KbnServerError and reportServerError?
//
// Search errors need to surface additional information
// such as rawResponse and sanitized requestParams.
// KbnServerError and reportServerError are used widely throughtout Kibana.
// KbnSearchError and reportSearchError exist to avoid polluting
// non-search usages of KbnServerError and reportServerError with extra information.
export class KbnSearchError extends KbnError {
  public errBody?: Record<string, any>;
  public requestParams?: SanitizedConnectionRequestParams;

  constructor(
    message: string,
    public readonly statusCode: number,
    errBody?: Record<string, any>,
    requestParams?: ConnectionRequestParams
  ) {
    super(message);
    this.errBody = errBody;
    this.requestParams = requestParams ? sanitizeRequestParams(requestParams) : undefined;
  }
}

/**
 * Formats any error thrown into a standardized `KbnSearchError`.
 * @param e `Error` or `ElasticsearchClientError`
 * @returns `KbnSearchError`
 */
export function getKbnSearchError(e: Error) {
  if (e instanceof KbnSearchError) return e;
  return new KbnSearchError(
    e.message ?? 'Unknown error',
    e instanceof errors.ResponseError ? e.statusCode! : 500,
    e instanceof errors.ResponseError ? e.body : undefined,
    e instanceof errors.ResponseError ? e.meta?.meta?.request?.params : undefined
  );
}

/**
 *
 * @param res Formats a `KbnSearchError` into a server error response
 * @param err
 */
export function reportSearchError(res: KibanaResponseFactory, err: KbnSearchError) {
  return res.customError({
    statusCode: err.statusCode ?? 500,
    body: {
      message: err.message,
      attributes: err.errBody
        ? {
            error: err.errBody.error,
            rawResponse: err.errBody.response,
            ...(err.requestParams ? { requestParams: err.requestParams } : {}),
          }
        : undefined,
    },
  });
}
