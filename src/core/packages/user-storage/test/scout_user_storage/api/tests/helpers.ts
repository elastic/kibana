/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker';
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

export const createHelpers = (headersGetter: () => Record<string, string>) => {
  const headers = () => ({ ...INTERNAL_HEADERS, ...headersGetter() });

  return {
    put: (apiClient: ApiClientFixture, key: string, value: unknown) =>
      apiClient.put(`internal/user_storage/${key}`, {
        headers: headers(),
        body: { value },
        responseType: 'json',
      }),

    get: (apiClient: ApiClientFixture) =>
      apiClient.get('internal/user_storage', {
        headers: headers(),
        responseType: 'json',
      }),

    del: (apiClient: ApiClientFixture, key: string) =>
      apiClient.delete(`internal/user_storage/${key}`, {
        headers: headers(),
        responseType: 'json',
      }),

    putInSpace: (apiClient: ApiClientFixture, spaceId: string, key: string, value: unknown) =>
      apiClient.put(`s/${spaceId}/internal/user_storage/${key}`, {
        headers: headers(),
        body: { value },
        responseType: 'json',
      }),

    getInSpace: (apiClient: ApiClientFixture, spaceId: string) =>
      apiClient.get(`s/${spaceId}/internal/user_storage`, {
        headers: headers(),
        responseType: 'json',
      }),

    delInSpace: (apiClient: ApiClientFixture, spaceId: string, key: string) =>
      apiClient.delete(`s/${spaceId}/internal/user_storage/${key}`, {
        headers: headers(),
        responseType: 'json',
      }),
  };
};
