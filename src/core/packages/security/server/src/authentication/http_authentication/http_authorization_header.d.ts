/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScopeableRequest } from '@kbn/core-elasticsearch-server';
export declare class HTTPAuthorizationHeader {
  /**
   * The authentication scheme. Should be consumed in a case-insensitive manner.
   * https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml#authschemes
   */
  readonly scheme: string;
  /**
   * The authentication credentials for the scheme.
   */
  readonly credentials: string;
  constructor(scheme: string, credentials: string);
  /**
   * Parses request's `Authorization` HTTP header if present.
   * @param request Request instance to extract the authorization header from.
   * @param [headerName] Optional name of the HTTP header to extract authentication information from. By default, the
   * authentication information is extracted from the `Authorization` HTTP header.
   */
  static parseFromRequest(
    request: ScopeableRequest,
    headerName?: string
  ): HTTPAuthorizationHeader | null;
  /**
   * Parses a raw `Authorization` header value. Use this when the credential is not (or not yet) on a
   * request, such as an outbound header set that has not been sent.
   * @param headerValue Raw header value, e.g. `Bearer some-token`.
   */
  static parseFromValue(headerValue: string): HTTPAuthorizationHeader | null;
  toString(): string;
}
