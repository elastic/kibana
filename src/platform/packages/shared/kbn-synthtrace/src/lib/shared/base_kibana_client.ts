/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file*/

import { kibanaHeaders } from './client_headers';
import { getFetchAgent } from '../../cli/utils/ssl';
import { normalizeUrl } from '../utils/normalize_url';
import { getBasicAuthHeader } from '../../cli/utils/get_auth_header';

export type KibanaClientFetchOptions = RequestInit & { ignore?: number[]; timeout?: number };
type KibanaClientFetchOptionsWithIgnore = RequestInit & { ignore: number[]; timeout?: number };

export class KibanaClientHttpError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly data?: unknown) {
    super(`${statusCode}: ${message}`);

    if (typeof data !== 'undefined' && this.stack) {
      let serializedData: string;

      try {
        serializedData = JSON.stringify(data, null, 2);
      } catch (error) {
        serializedData = String(data);
      }

      this.stack = `${this.stack}\nData: ${serializedData}`;
    }
  }
}

export class KibanaClient {
  private target: string;
  private headers: Record<string, string>;

  constructor(options: { target: string; headers?: Record<string, string> }) {
    this.target = options.target;
    this.headers = { ...kibanaHeaders(), ...(options.headers ?? {}) };
  }

  fetch<T>(pathname: string, options: KibanaClientFetchOptions): Promise<T>;
  fetch<T>(pathname: string, options: KibanaClientFetchOptionsWithIgnore): Promise<undefined>;
  fetch(pathname: string, options: KibanaClientFetchOptionsWithIgnore) {
    const pathnameWithLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const url = new URL(`${this.target}${pathnameWithLeadingSlash}`);
    const { username, password } = url;
    url.username = '';
    url.password = '';

    // Extract credentials from URL and add them to headers (native fetch doesn't support credentials in URLs)
    const authHeaders = getBasicAuthHeader(username, password);

    const { timeout, ...fetchOptions } = options;
    const normalizedUrl = normalizeUrl(url.toString());
    return fetch(normalizedUrl, {
      ...fetchOptions,
      headers: {
        ...this.headers,
        ...authHeaders,
        ...fetchOptions.headers,
      },
      dispatcher: getFetchAgent(normalizedUrl),
      signal: timeout ? AbortSignal.timeout(timeout) : undefined,
    } as RequestInit).then(async (response) => {
      if (options.ignore && options.ignore.includes(response.status)) {
        return undefined;
      }

      if (response.status >= 400) {
        throw new KibanaClientHttpError(
          `Response error for ${options.method?.toUpperCase() ?? 'GET'} ${normalizedUrl}`,
          response.status,
          await response.json().catch((error) => {
            return undefined;
          })
        );
      }
      return response.json();
    });
  }
}
