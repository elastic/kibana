/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INTERNAL_HEADERS } from '../fixtures';

// Mirrors the `register()` call in
// `src/platform/test/user_storage/plugins/user_storage_test/server/plugin.ts`.
// Keep both in sync when changing the test fixture.
export const ALL_KEYS = [
  'test:string_key',
  'test:number_key',
  'test:object_key',
  'test:boolean_key',
  'test:array_key',
];

export const DEFAULT_VALUES: Record<string, unknown> = {
  'test:string_key': 'default_value',
  'test:number_key': 42,
  'test:object_key': {
    theme: 'light',
    sidebar: { collapsed: false, width: 250 },
    pinnedItems: [],
  },
  'test:boolean_key': false,
  'test:array_key': [],
};

interface ApiClientOptions {
  headers?: Record<string, string>;
  body?: unknown;
  responseType?: 'json' | 'text' | 'buffer';
}

interface ApiClientResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[]>;
  body: any;
}

interface ApiClient {
  get(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  put(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  delete(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
}

export const createHelpers = (headersGetter: () => Record<string, string>) => {
  const headers = () => ({ ...INTERNAL_HEADERS, ...headersGetter() });

  const getKey = (apiClient: ApiClient, key: string) =>
    apiClient.get(`internal/user_storage/${key}`, {
      headers: headers(),
      responseType: 'json',
    });

  const getKeyInSpace = (apiClient: ApiClient, spaceId: string, key: string) =>
    apiClient.get(`s/${spaceId}/internal/user_storage/${key}`, {
      headers: headers(),
      responseType: 'json',
    });

  /**
   * Fetches every key in ALL_KEYS individually and assembles the results into
   * a response-like object: `{ statusCode, body: Record<key, value> }`.
   * The `statusCode` reflects the last non-200 response seen, or 200 if all
   * succeeded. Use this when a test needs to assert across multiple keys at
   * once while staying compatible with the per-key route.
   */
  const getAllKeys = async (
    apiClient: ApiClient
  ): Promise<{ statusCode: number; body: Record<string, unknown> }> => {
    const body: Record<string, unknown> = {};
    let lastFailCode = 200;
    for (const key of ALL_KEYS) {
      const res = await getKey(apiClient, key);
      if (res.statusCode !== 200) {
        lastFailCode = res.statusCode;
        continue;
      }
      body[key] = res.body.value;
    }
    return { statusCode: lastFailCode, body };
  };

  const getAllKeysInSpace = async (
    apiClient: ApiClient,
    spaceId: string
  ): Promise<{ statusCode: number; body: Record<string, unknown> }> => {
    const body: Record<string, unknown> = {};
    let lastFailCode = 200;
    for (const key of ALL_KEYS) {
      const res = await getKeyInSpace(apiClient, spaceId, key);
      if (res.statusCode !== 200) {
        lastFailCode = res.statusCode;
        continue;
      }
      body[key] = res.body.value;
    }
    return { statusCode: lastFailCode, body };
  };

  return {
    getKey,
    getKeyInSpace,
    getAllKeys,
    getAllKeysInSpace,

    put: (apiClient: ApiClient, key: string, value: unknown) =>
      apiClient.put(`internal/user_storage/${key}`, {
        headers: headers(),
        body: { value },
        responseType: 'json',
      }),

    del: (apiClient: ApiClient, key: string) =>
      apiClient.delete(`internal/user_storage/${key}`, {
        headers: headers(),
        responseType: 'json',
      }),

    putInSpace: (apiClient: ApiClient, spaceId: string, key: string, value: unknown) =>
      apiClient.put(`s/${spaceId}/internal/user_storage/${key}`, {
        headers: headers(),
        body: { value },
        responseType: 'json',
      }),

    delInSpace: (apiClient: ApiClient, spaceId: string, key: string) =>
      apiClient.delete(`s/${spaceId}/internal/user_storage/${key}`, {
        headers: headers(),
        responseType: 'json',
      }),
  };
};
