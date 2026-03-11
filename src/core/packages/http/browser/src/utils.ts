/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError } from './types';

/** @public */
export function isHttpFetchError<T>(error: T | IHttpFetchError): error is IHttpFetchError {
  return error instanceof Error && 'request' in error && 'name' in error;
}

type HttpPathParams = Record<string, string | number | boolean | null | undefined>;

const OPTIONAL_PATH_SEGMENT_REGEX = /\/\{(\w+)\?\}/g;
const REQUIRED_PATH_PARAM_REGEX = /\{(\w+)\}/g;
/**
 * Builds a URL path from a route template by URI-encoding path params.
 *
 * @example
 * buildPath('/api/dashboards/{id}', { id: '../../../internal/security/users/foo' });
 * // '/api/dashboards/..%2F..%2F..%2Finternal%2Fsecurity%2Fusers%2Ffoo'
 *
 * @public
 */
export function buildPath(path: string, params: HttpPathParams = {}) {
  const pathWithOptionalSegments = path.replace(OPTIONAL_PATH_SEGMENT_REGEX, (match, paramName) => {
    const value = params[paramName];
    return value == null ? '' : `/${encodeURIComponent(String(value))}`;
  });

  return pathWithOptionalSegments.replace(REQUIRED_PATH_PARAM_REGEX, (match, paramName) => {
    const value = params[paramName];

    if (value == null) {
      throw new Error(`Missing required path parameter: ${paramName}`);
    }

    return encodeURIComponent(String(value));
  });
}
