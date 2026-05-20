/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { IKibanaSearchRequest } from '@kbn/search-types';
import type { ESQLSearchParams } from '@kbn/es-types';

const mockCore = {
  http: {
    get: async (path: string) => {
      if (String(path).includes('/internal/esql/autocomplete/sources/')) {
        return [
          { name: 'logs-*', hidden: false, type: 'data stream' },
          { name: 'metrics-*', hidden: false, type: 'data stream' },
          { name: 'kibana_sample_data_logs', hidden: false, type: 'index' },
          { name: 'kibana_sample_data_ecommerce', hidden: false, type: 'index' },
        ];
      }
      if (String(path).includes('/api/kibana/favorites/')) {
        return { favoriteIds: [] };
      }
      return {};
    },
    post: async () => ({ favoriteIds: [] }),
    delete: async () => {},
    basePath: { prepend: (p: string) => p, get: () => '' },
  },
  userProfile: {
    getCurrent: async () => ({ uid: 'storybook-user', enabled: true, data: {} }),
    bulkGet: async () => new Map(),
    suggest: async () => [],
    getEnabled$: () => of(true),
  },
  chrome: {
    getActiveSolutionNavId$: () => new BehaviorSubject<string | null>(null),
  },
  pricing: { getActiveProduct: () => undefined },
  analytics: { reportEvent: () => {}, optIn: () => {} },
  notifications: {
    toasts: {
      addError: () => ({ id: '' }),
      addSuccess: () => ({ id: '' }),
      addWarning: () => ({ id: '' }),
      addDanger: () => ({ id: '' }),
      remove: () => {},
      get$: () => of([]),
    },
  },
  application: {
    navigateToApp: async () => {},
    currentAppId$: of('discover'),
    capabilities: {},
  },
};

const mockUiSettings = {
  get: (key: string) => {
    if (key === 'histogram:barTarget') return 50;
    return undefined;
  },
};

const mockStorage = {
  get: (_key: string) => null,
  set: (_key: string, _value: unknown) => {},
  remove: (_key: string) => {},
  clear: () => {},
};

const mockUiActions = {
  getTrigger: (_id: string) => ({ exec: async () => {} }),
};

const MOCK_COLUMNS_BY_INDEX: Record<string, Array<{ name: string; type: string }>> = {
  kibana_sample_data_logs: [
    { name: '@timestamp', type: 'date' },
    { name: 'bytes', type: 'long' },
    { name: 'clientip', type: 'ip' },
    { name: 'extension', type: 'keyword' },
    { name: 'geo.coordinates', type: 'geo_point' },
    { name: 'geo.dest', type: 'keyword' },
    { name: 'geo.src', type: 'keyword' },
    { name: 'host', type: 'keyword' },
    { name: 'index', type: 'keyword' },
    { name: 'ip', type: 'ip' },
    { name: 'machine.os', type: 'keyword' },
    { name: 'machine.ram', type: 'long' },
    { name: 'message', type: 'text' },
    { name: 'phpmemory', type: 'long' },
    { name: 'referer', type: 'keyword' },
    { name: 'request', type: 'keyword' },
    { name: 'response', type: 'keyword' },
    { name: 'tags', type: 'keyword' },
    { name: 'url', type: 'keyword' },
    { name: 'utc_time', type: 'date' },
  ],
  kibana_sample_data_ecommerce: [
    { name: '@timestamp', type: 'date' },
    { name: 'category', type: 'keyword' },
    { name: 'currency', type: 'keyword' },
    { name: 'customer_first_name', type: 'keyword' },
    { name: 'customer_full_name', type: 'keyword' },
    { name: 'customer_gender', type: 'keyword' },
    { name: 'customer_id', type: 'keyword' },
    { name: 'customer_last_name', type: 'keyword' },
    { name: 'day_of_week', type: 'keyword' },
    { name: 'email', type: 'keyword' },
    { name: 'geoip.city_name', type: 'keyword' },
    { name: 'geoip.continent_name', type: 'keyword' },
    { name: 'geoip.country_iso_code', type: 'keyword' },
    { name: 'geoip.location', type: 'geo_point' },
    { name: 'geoip.region_name', type: 'keyword' },
    { name: 'order_date', type: 'date' },
    { name: 'order_id', type: 'keyword' },
    { name: 'products.base_price', type: 'double' },
    { name: 'products.product_name', type: 'keyword' },
    { name: 'products.quantity', type: 'integer' },
    { name: 'taxful_total_price', type: 'double' },
    { name: 'taxless_total_price', type: 'double' },
    { name: 'total_quantity', type: 'integer' },
    { name: 'user', type: 'keyword' },
  ],
};

const mockData = {
  search: {
    search: (request: IKibanaSearchRequest<ESQLSearchParams>) => {
      const query: string = request?.params?.query ?? '';
      const matchedIndex = Object.keys(MOCK_COLUMNS_BY_INDEX).find((idx) => query.includes(idx));
      const allColumns = matchedIndex ? MOCK_COLUMNS_BY_INDEX[matchedIndex] : [];
      return of({
        rawResponse: { columns: allColumns, all_columns: allColumns, values: [] },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      });
    },
    session: { getSessionId: () => undefined },
  },
  query: {
    timefilter: {
      timefilter: {
        getAbsoluteTime: () => ({
          from: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        }),
        getTime: () => ({ from: 'now-15m', to: 'now' }),
      },
    },
  },
};

const mockKql = {
  autocomplete: {
    hasQuerySuggestions: () => false,
    getQuerySuggestions: async () => [],
  },
};

export const mockServices = {
  core: mockCore,
  http: mockCore.http,
  application: mockCore.application,
  uiSettings: mockUiSettings,
  settings: { client: mockUiSettings },
  data: mockData,
  kql: mockKql,
  storage: mockStorage,
  uiActions: mockUiActions,
};

export const EditorServicesProvider = ({ children }: { children: React.ReactNode }) => (
  <KibanaContextProvider services={mockServices as unknown as Record<string, unknown>}>
    {children}
  </KibanaContextProvider>
);
