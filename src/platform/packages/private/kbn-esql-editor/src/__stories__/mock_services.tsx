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

const mockData = {
  search: {
    search: () =>
      of({
        rawResponse: { columns: [], all_columns: [] },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      }),
    session: { getSessionId: () => undefined },
  },
  query: {
    timefilter: {
      timefilter: {
        getAbsoluteTime: () => ({ from: 'now-15m', to: 'now' }),
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
