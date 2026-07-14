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

type HttpPathParamPrimitive = string | number | boolean;
type HttpPathParamValue = HttpPathParamPrimitive | readonly HttpPathParamPrimitive[];
type HttpPathParams = Record<string, HttpPathParamValue | undefined>;

const OPTIONAL_PATH_SEGMENT_REGEX = /\/\{(\w+)\?\}/g;
const REQUIRED_PATH_PARAM_REGEX = /\{(\w+)(\*(\d*))?\}/g;
const UNSUPPORTED_PATH_TEMPLATE_REGEX = /\{[^}]+\}/;

const encodePathSegment = (value: HttpPathParamPrimitive) => encodeURIComponent(String(value));

const getMultiSegmentValues = (value: HttpPathParamValue) =>
  Array.isArray(value) ? value : String(value).split('/');

const serializePathParam = (
  paramName: string,
  value: HttpPathParamValue,
  segmentCount?: number
) => {
  if (segmentCount == null) {
    if (Array.isArray(value)) {
      throw new Error(`Expected a single path segment for parameter: ${paramName}`);
    }

    return encodePathSegment(value as HttpPathParamPrimitive);
  }

  // Wildcard params represent multiple path segments, so string inputs are split on `/`
  // before each segment is encoded and re-joined.
  const segments = getMultiSegmentValues(value);

  if (segmentCount > -1 && segments.length !== segmentCount) {
    throw new Error(
      `Expected ${segmentCount} path segment(s) for parameter: ${paramName}, received ${segments.length}`
    );
  }

  return segments.map(encodePathSegment).join('/');
};
/**
 * Builds a URL path from a route template by URI-encoding path params.
 *
 * @example
 * buildPath('/api/dashboards/{id}', { id: '../../../internal/security/users/foo' });
 * // '/api/dashboards/..%2F..%2F..%2Finternal%2Fsecurity%2Fusers%2Ffoo'
 *
 * @example
 * buildPath('/api/files/{filePath*}', { filePath: 'nested/folder/my file.txt' });
 * // '/api/files/nested/folder/my%20file.txt'
 *
 * @public
 */
export function buildPath(path: string, params: HttpPathParams = {}) {
  const pathWithOptionalSegments = path.replace(OPTIONAL_PATH_SEGMENT_REGEX, (match, paramName) => {
    const value = params[paramName];
    return value == null ? '' : `/${serializePathParam(paramName, value)}`;
  });

  const builtPath = pathWithOptionalSegments.replace(
    REQUIRED_PATH_PARAM_REGEX,
    (match, paramName, multiSegmentMatch, segmentCountMatch) => {
      const value = params[paramName];

      if (value == null) {
        throw new Error(`Missing required path parameter: ${paramName}`);
      }

      const segmentCount =
        multiSegmentMatch == null
          ? undefined
          : segmentCountMatch === ''
          ? -1
          : Number(segmentCountMatch);

      return serializePathParam(paramName, value, segmentCount);
    }
  );

  const unsupportedToken = builtPath.match(UNSUPPORTED_PATH_TEMPLATE_REGEX)?.[0];

  if (unsupportedToken) {
    throw new Error(`Unsupported path template syntax: ${unsupportedToken}`);
  }

  return builtPath;
}
