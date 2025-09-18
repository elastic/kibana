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

export type CaseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CaseOwner = 'cases' | 'observability' | 'securitySolution';

export interface CreateCaseParams {
  title: string;
  description: string;
  tags?: string[];
  severity?: CaseSeverity;
  assignees?: Array<{ uid: string }>;
  connector?: {
    id: string;
    name: string;
    type: string;
    fields: Record<string, any> | null;
  };
  settings?: {
    syncAlerts: boolean;
  };
  owner?: string;
  category: string | null;
  customFields: string[];
}

export interface UpdateCaseParams {
  id: string;
  version: string;
  title?: string;
  description?: string;
  status?: 'open' | 'in-progress' | 'closed';
  tags?: string[];
  severity?: CaseSeverity;
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
  category?: string;
}

export interface CreateCommentParams {
  type: 'user';
  owner: CaseOwner;
  comment: string;
}

export interface CreateAlertParams {
  type: 'alert';
  owner: CaseOwner;
  comment?: string;
  index: string | string[];
  alertId: string | string[];
  rule: { id: string; name: string };
}

export interface CasesApiService {
  create: (params: CreateCaseParams, spaceId?: string) => Promise<any>;
  get: (caseId: string, spaceId?: string) => Promise<any>;
  update: (updates: UpdateCaseParams[], spaceId?: string) => Promise<any>;
  delete: (caseIds: string[], spaceId?: string) => Promise<void>;
  find: (searchParams?: Record<string, any>, spaceId?: string) => Promise<any>;
  connectors: {
    get: (spaceId?: string) => Promise<any>;
  };
  comments: {
    create: (
      caseId: string,
      params: CreateCommentParams | CreateAlertParams,
      spaceId?: string
    ) => Promise<any>;
    get: (caseId: string, commentId: string, spaceId?: string) => Promise<any>;
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
    comments: {
      create: async (
        caseId: string,
        params: CreateCommentParams | CreateAlertParams,
        spaceId?: string
      ) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.comments.create [${caseId}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/cases/${caseId}/comments`,
              retries: 3,
              body: params,
            });
          }
        );
      },
      get: async (caseId: string, commentId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.comments.get [${caseId}, ${commentId}]`,
          async () => {
            return await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/cases/${caseId}/comments/${commentId}`,
              retries: 3,
              ignoreErrors: [404],
            });
          }
        );
      },
    },
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
          ignoreErrors: [404],
        });
      });
    },

    update: async (updates: UpdateCaseParams[], spaceId?: string) => {
      return await measurePerformanceAsync(
        log,
        `casesApi.cases.update [${updates.length} cases]`,
        async () => {
          return await kbnClient.request({
            method: 'PATCH',
            path: `${buildSpacePath(spaceId)}/api/cases`,
            retries: 3,
            body: {
              cases: updates.map((update) => {
                // Validate required fields
                if (!update.id) {
                  throw new Error('Case ID is required for update');
                }
                if (!update.version) {
                  throw new Error('Case version is required for update');
                }

                const caseUpdate: any = {
                  id: update.id,
                  version: update.version,
                };

                // Only include fields that are explicitly provided
                if (update.title !== undefined) caseUpdate.title = update.title;
                if (update.description !== undefined) caseUpdate.description = update.description;
                if (update.status !== undefined) caseUpdate.status = update.status;
                if (update.tags !== undefined) caseUpdate.tags = update.tags;
                if (update.severity !== undefined) caseUpdate.severity = update.severity;
                if (update.assignees !== undefined) caseUpdate.assignees = update.assignees;
                if (update.connector !== undefined) caseUpdate.connector = update.connector;
                if (update.settings !== undefined) caseUpdate.settings = update.settings;
                if (update.category !== undefined) caseUpdate.category = update.category;

                return caseUpdate;
              }),
            },
          });
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
            retries: 0,
            query: {
              ids: JSON.stringify(caseIds),
            },
            ignoreErrors: [204, 404],
          });
        }
      );
    },

    find: async (searchParams?: Record<string, any>, spaceId?: string) => {
      return await measurePerformanceAsync(log, 'casesApi.cases.find', async () => {
        return await kbnClient.request({
          method: 'GET',
          path: `${buildSpacePath(spaceId)}/api/cases/_find`,
          retries: 3,
          query: searchParams,
        });
      });
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
            query: { perPage: 100 },
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
                perPage: 100,
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
