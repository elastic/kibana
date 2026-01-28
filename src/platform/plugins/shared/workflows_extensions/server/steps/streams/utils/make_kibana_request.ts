/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';

interface MakeKibanaRequestOptions {
  kibanaUrl: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | undefined>;
  body?: unknown;
  fakeRequest: KibanaRequest;
  abortSignal?: AbortSignal;
}

/**
 * Makes an internal HTTP request to a Kibana API endpoint.
 * Uses the fake request's headers for authentication.
 */
export async function makeKibanaRequest<T>({
  kibanaUrl,
  path,
  method = 'GET',
  query,
  body,
  fakeRequest,
  abortSignal,
}: MakeKibanaRequestOptions): Promise<T> {
  // Build the URL with query parameters
  const url = new URL(path, kibanaUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
  }

  // Extract authentication headers from the fake request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'elastic-api-version': '2023-10-31',
  };

  // Forward authentication headers
  const authHeader = fakeRequest.headers.authorization;
  if (authHeader) {
    headers.authorization = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  }

  // Forward cookies if present
  const cookieHeader = fakeRequest.headers.cookie;
  if (cookieHeader) {
    headers.cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: abortSignal,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Kibana API request failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}
