/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { MiniApp, CreateMiniAppRequest, UpdateMiniAppRequest } from '../../common';
import { MINI_APPS_API_BASE } from '../../common';

export interface MiniAppsListResponse {
  items: MiniApp[];
  total: number;
}

export interface MiniAppsApiClient {
  list: () => Promise<MiniAppsListResponse>;
  get: (id: string) => Promise<MiniApp>;
  create: (data: CreateMiniAppRequest) => Promise<MiniApp>;
  update: (id: string, data: UpdateMiniAppRequest) => Promise<MiniApp>;
  delete: (id: string) => Promise<void>;
}

export const createMiniAppsApiClient = (http: HttpSetup): MiniAppsApiClient => {
  return {
    list: async () => {
      return http.get<MiniAppsListResponse>(MINI_APPS_API_BASE);
    },

    get: async (id: string) => {
      return http.get<MiniApp>(`${MINI_APPS_API_BASE}/${encodeURIComponent(id)}`);
    },

    create: async (data: CreateMiniAppRequest) => {
      return http.post<MiniApp>(MINI_APPS_API_BASE, {
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: UpdateMiniAppRequest) => {
      return http.put<MiniApp>(`${MINI_APPS_API_BASE}/${encodeURIComponent(id)}`, {
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      await http.delete(`${MINI_APPS_API_BASE}/${encodeURIComponent(id)}`);
    },
  };
};
