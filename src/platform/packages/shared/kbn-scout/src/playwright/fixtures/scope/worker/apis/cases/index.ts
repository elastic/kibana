/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface CreateCaseParams {
  title: string;
  description: string;
  tags?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  assignees?: Array<{ uid: string }>;
  connector?: {
    id: string;
    name: string;
    type: string;
    fields: Record<string, any>;
  };
  settings?: {
    syncAlerts: boolean;
  };
  owner?: string;
  category?: string;
}

export interface UpdateCaseParams {
  id: string;
  title?: string;
  description?: string;
  status?: 'open' | 'in-progress' | 'closed';
  tags?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  assignees?: Array<{ uid: string }>;
  connector?: {
    id: string;
    name: string;
    type: string;
    fields: Record<string, any>;
  };
  settings?: {
    syncAlerts: boolean;
  };
  version: string;
  category?: string;
}

export interface CasesApiService {
  cases: {
    create: (params: CreateCaseParams, spaceId?: string) => Promise<any>;
    get: (caseId: string, spaceId?: string) => Promise<any>;
    update: (updates: UpdateCaseParams[], spaceId?: string) => Promise<any>;
    delete: (caseIds: string[], spaceId?: string) => Promise<void>;
    find: (searchParams?: Record<string, any>, spaceId?: string) => Promise<any>;
  };
  connectors: {
    get: (spaceId?: string) => Promise<any>;
  };
  cleanup: {
    deleteAllCases: (spaceId?: string) => Promise<void>;
    deleteCasesByTags: (tags: string[], spaceId?: string) => Promise<void>;
  };
}

export const getCasesApiHelper = (log: ScoutLogger, kbnClient: KbnClient): CasesApiService => {
  const buildSpacePath = (spaceId?: string, path: string = '') => {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}${path}` : path;
  };

  return {
    cases: {
      create: async (params: CreateCaseParams, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.cases.create [${params.title}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/cases`,
              retries: 3,
              body: {
                title: params.title,
                description: params.description,
                tags: params.tags || [],
                severity: params.severity || 'low',
                assignees: params.assignees || [],
                connector: params.connector || {
                  id: 'none',
                  name: 'none',
                  type: '.none',
                  fields: null,
                },
                settings: params.settings || {
                  syncAlerts: true,
                },
                owner: params.owner || 'cases',
                ...(params.category && { category: params.category }),
              },
            });
          }
        );
      },

      get: async (caseId: string, spaceId?: string) => {
        return await measurePerformanceAsync(log, `casesApi.cases.get [${caseId}]`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/cases/${caseId}`,
            retries: 3,
          });
        });
      },

      update: async (updates: UpdateCaseParams[], spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.cases.update [${updates.length} cases]`,
          async () => {
            const response = await kbnClient.request({
              method: 'PATCH',
              path: `${buildSpacePath(spaceId)}/api/cases`,
              retries: 3,
              body: {
                cases: updates.map((update) => ({
                  id: update.id,
                  version: update.version,
                  ...(update.title && { title: update.title }),
                  ...(update.description && { description: update.description }),
                  ...(update.status && { status: update.status }),
                  ...(update.tags && { tags: update.tags }),
                  ...(update.severity && { severity: update.severity }),
                  ...(update.assignees && { assignees: update.assignees }),
                  ...(update.connector && { connector: update.connector }),
                  ...(update.settings && { settings: update.settings }),
                  ...(update.category && { category: update.category }),
                })),
              },
            });
            return response.data;
          }
        );
      },

      delete: async (caseIds: string[], spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.cases.delete [${caseIds.length} cases]`,
          async () => {
            await kbnClient.request({
              method: 'DELETE',
              path: `${buildSpacePath(spaceId)}/api/cases`,
              retries: 3,
              query: {
                ids: JSON.stringify(caseIds),
              },
              ignoreErrors: [404],
            });
          }
        );
      },

      find: async (searchParams?: Record<string, any>, spaceId?: string) => {
        return await measurePerformanceAsync(log, 'casesApi.cases.find', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/cases/_find`,
            retries: 3,
            query: searchParams,
          });
          return response.data;
        });
      },
    },

    connectors: {
      get: async (spaceId?: string) => {
        return await measurePerformanceAsync(log, 'casesApi.connectors.get', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/cases/configure/connectors/_find`,
            retries: 3,
          });
          return response.data;
        });
      },
    },

    cleanup: {
      deleteAllCases: async (spaceId?: string) => {
        return await measurePerformanceAsync(log, 'casesApi.cleanup.deleteAllCases', async () => {
          const cases = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/cases/_find`,
            retries: 3,
            query: { perPage: 10000 },
          });

          const casesData = cases.data as any;
          if (casesData.cases && casesData.cases.length > 0) {
            const caseIds = casesData.cases.map((caseItem: any) => caseItem.id);
            await kbnClient.request({
              method: 'DELETE',
              path: `${buildSpacePath(spaceId)}/api/cases`,
              retries: 3,
              query: {
                ids: JSON.stringify(caseIds),
              },
              ignoreErrors: [404],
            });
          }
        });
      },

      deleteCasesByTags: async (tags: string[], spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.cleanup.deleteCasesByTags [${tags.join(',')}]`,
          async () => {
            const cases = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/cases/_find`,
              retries: 3,
              query: {
                tags: tags.join(','),
                perPage: 10000,
              },
            });

            const casesData = cases.data as any;
            if (casesData.cases && casesData.cases.length > 0) {
              const caseIds = casesData.cases.map((caseItem: any) => caseItem.id);
              await kbnClient.request({
                method: 'DELETE',
                path: `${buildSpacePath(spaceId)}/api/cases`,
                retries: 3,
                query: {
                  ids: JSON.stringify(caseIds),
                },
                ignoreErrors: [404],
              });
            }
          }
        );
      },
    },
  };
};
