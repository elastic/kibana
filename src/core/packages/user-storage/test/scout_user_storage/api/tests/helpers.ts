/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INTERNAL_HEADERS } from '../fixtures';

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

  return {
    put: (apiClient: ApiClient, key: string, value: unknown) =>
      apiClient.put(`internal/user_storage/${key}`, {
        headers: headers(),
        body: { value },
        responseType: 'json',
      }),

    get: (apiClient: ApiClient) =>
      apiClient.get('internal/user_storage', {
        headers: headers(),
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

    getInSpace: (apiClient: ApiClient, spaceId: string) =>
      apiClient.get(`s/${spaceId}/internal/user_storage`, {
        headers: headers(),
        responseType: 'json',
      }),

    delInSpace: (apiClient: ApiClient, spaceId: string, key: string) =>
      apiClient.delete(`s/${spaceId}/internal/user_storage/${key}`, {
        headers: headers(),
        responseType: 'json',
      }),
  };
};
