/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { FetchLike } from '@kbn/mcp-client';

/**
 * Builds a Fetch API–compatible function that delegates to a preconfigured
 * Axios instance. Use this when you already have an axios instance with auth,
 * SSL, and proxy configured (e.g. from getAxiosInstanceWithAuth) so that
 * McpClient can reuse the same transport and auth instead of duplicating it.
 *
 * @param axiosInstance - Axios instance with auth and any other config already applied
 * @returns A FetchLike suitable for passing to McpClient as the `fetch` option
 */
export function createFetchFromAxios(axiosInstance: AxiosInstance): FetchLike {
  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, value] of init.headers) {
          headers[key] = value;
        }
      } else {
        Object.assign(headers, init.headers);
      }
    }

    const res = await axiosInstance.request({
      url: urlString,
      method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD',
      headers: Object.keys(headers).length ? headers : undefined,
      data: init?.body ?? undefined,
      signal: init?.signal ?? undefined,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    const resHeaders = new Headers();
    if (res.headers && typeof res.headers === 'object') {
      for (const [key, value] of Object.entries(res.headers)) {
        if (value !== undefined && value !== null) {
          resHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
        }
      }
    }

    return new Response(res.data, {
      status: res.status,
      statusText: res.statusText ?? '',
      headers: resHeaders,
    });
  };
}
