/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Boom from '@hapi/boom';
import { get } from 'lodash';

const code = Symbol('ElasticsearchError');

enum ErrorCode {
  NOT_AUTHORIZED = 'Elasticsearch/notAuthorized',
}

/**
 * @deprecated. The new elasticsearch client doesn't wrap errors anymore.
 * @public
 * */
export interface LegacyElasticsearchError extends Boom.Boom {
  [code]?: string;
}

function isElasticsearchError(error: any): error is LegacyElasticsearchError {
  return Boolean(error && error[code]);
}

function decorate(
  error: Error,
  errorCode: ErrorCode,
  statusCode: number,
  message?: string
): LegacyElasticsearchError {
  if (isElasticsearchError(error)) {
    return error;
  }

  const boom = Boom.boomify(error, {
    statusCode,
    message,
    // keep status and messages if Boom error object already has them
    override: false,
  }) as LegacyElasticsearchError;

  boom[code] = errorCode;

  return boom;
}

/**
 * Helpers for working with errors returned from the Elasticsearch service.Since the internal data of
 * errors are subject to change, consumers of the Elasticsearch service should always use these helpers
 * to classify errors instead of checking error internals such as `body.error.header[WWW-Authenticate]`
 * @public
 *
 * @example
 * Handle errors
 * ```js
 * try {
 *   await client.asScoped(request).callAsCurrentUser(...);
 * } catch (err) {
 *   if (ElasticsearchErrorHelpers.isNotAuthorizedError(err)) {
 *     const authHeader = err.output.headers['WWW-Authenticate'];
 *   }
 * ```
 */
export class LegacyElasticsearchErrorHelpers {
  public static isNotAuthorizedError(error: any): error is LegacyElasticsearchError {
    return isElasticsearchError(error) && error[code] === ErrorCode.NOT_AUTHORIZED;
  }

  public static decorateNotAuthorizedError(error: Error, reason?: string) {
    const decoratedError = decorate(error, ErrorCode.NOT_AUTHORIZED, 401, reason);
    const wwwAuthHeader = get(error, 'body.error.header[WWW-Authenticate]') as string;

    (decoratedError.output.headers as { [key: string]: string })['WWW-Authenticate'] =
      wwwAuthHeader || 'Basic realm="Authorization Required"';

    return decoratedError;
  }
}
