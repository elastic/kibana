/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ApiResponse,
  ApiStatusResponse,
  Attachment,
  Case,
  CaseUpdateRequest,
  CaseCreateRequest,
  CasesFindRequest,
  CasesFindResponse,
  AttachmentRequest,
} from './types';

import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface CasesApiService {
  create: (params: CaseCreateRequest, spaceId?: string) => Promise<ApiResponse<Case>>;
  get: (caseId: string, spaceId?: string) => Promise<ApiResponse<Case>>;
  update: (params: CaseUpdateRequest[], spaceId?: string) => Promise<ApiResponse<Case[]>>;
  delete: (caseIds: string[], spaceId?: string) => Promise<ApiStatusResponse>;
  find: (params?: CasesFindRequest, spaceId?: string) => Promise<ApiResponse<Case[]>>;
  connectors: {
    get: (spaceId?: string) => Promise<ApiResponse<any>>;
  };
  comments: {
    create: (
      caseId: string,
      params: AttachmentRequest,
      spaceId?: string
    ) => Promise<ApiResponse<Case>>;
    get: (caseId: string, commentId: string, spaceId?: string) => Promise<ApiResponse<Attachment>>;
  };
  cleanup: {
    deleteAllCases: (spaceId?: string) => Promise<ApiStatusResponse>;
    deleteCasesByTags: (tags: string[], spaceId?: string) => Promise<ApiStatusResponse>;
  };
}

export const getCasesApiHelper = (log: ScoutLogger, kbnClient: KbnClient): CasesApiService => {
  const buildSpacePath = (spaceId?: string, path: string = '') => {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}${path}` : path;
  };

  /**
   * Helper to find case IDs matching the query parameters
   * @param spaceId - Optional space ID
   * @param query - Search parameters
   * @returns Array of case IDs
   * @note Limited to first page (100 cases max)
   */
  const findCaseIds = async (spaceId?: string, query?: Record<string, any>): Promise<string[]> => {
    const response = await kbnClient.request({
      method: 'GET',
      path: `${buildSpacePath(spaceId)}/api/cases/_find`,
      retries: 3,
      query: { ...query, page: 1, perPage: 100 },
    });
    const casesData = response.data as CasesFindResponse;
    const caseIds: string[] = casesData.cases.map((caseItem) => caseItem.id);
    return caseIds;
  };

  return {
    create: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `casesApi.cases.create [${params.title}]`,
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/cases`,
            retries: 3,
            body: { ...params },
          });
          return { data: response.data as Case, status: response.status };
        }
      );
    },
    get: async (caseId, spaceId) => {
      return await measurePerformanceAsync(log, `casesApi.cases.get [${caseId}]`, async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `${buildSpacePath(spaceId)}/api/cases/${caseId}`,
          retries: 3,
          ignoreErrors: [404],
        });
        return { data: response.data as Case, status: response.status };
      });
    },
    update: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `casesApi.cases.update [${params.length} cases]`,
        async () => {
          const response = await kbnClient.request({
            method: 'PATCH',
            path: `${buildSpacePath(spaceId)}/api/cases`,
            retries: 3,
            body: {
              cases: params.map((update) => {
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
          return { data: response.data as Case[], status: response.status };
        }
      );
    },
    delete: async (caseIds, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `casesApi.cases.delete [${caseIds.length} cases]`,
        async () => {
          if (caseIds.length === 0) return { status: 200 };
          const response = await kbnClient.request({
            method: 'DELETE',
            path: `${buildSpacePath(spaceId)}/api/cases`,
            retries: 0,
            query: { ids: JSON.stringify(caseIds) },
            ignoreErrors: [204, 404],
          });
          return { status: response.status };
        }
      );
    },
    find: async (params, spaceId) => {
      return await measurePerformanceAsync(log, 'casesApi.cases.find', async () => {
        // Note: By default, the Cases API will return the first page with default page size.
        // If not explicitly set in the params, this will only fetch the first page (up to 100 cases).
        const response = await kbnClient.request({
          method: 'GET',
          path: `${buildSpacePath(spaceId)}/api/cases/_find`,
          retries: 3,
          query: params,
        });
        const data = response.data as CasesFindResponse;

        return { data: data.cases, status: response.status };
      });
    },
    connectors: {
      get: async (spaceId) => {
        return await measurePerformanceAsync(log, 'casesApi.connectors.get', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/cases/configure/connectors/_find`,
            retries: 3,
          });
          return { data: response.data, status: response.status };
        });
      },
    },
    comments: {
      create: async (caseId, params, spaceId) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.comments.create [${caseId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/cases/${caseId}/comments`,
              retries: 3,
              body: params,
            });
            return { data: response.data as Case, status: response.status };
          }
        );
      },
      get: async (caseId, commentId, spaceId) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.comments.get [${caseId}, ${commentId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/cases/${caseId}/comments/${commentId}`,
              retries: 3,
              ignoreErrors: [404],
            });
            return { data: response.data as Attachment, status: response.status };
          }
        );
      },
    },
    cleanup: {
      deleteAllCases: async (spaceId) => {
        return await measurePerformanceAsync(log, 'casesApi.cleanup.deleteAllCases', async () => {
          const caseIds = await findCaseIds(spaceId);
          if (caseIds.length === 0) return { status: 200 };
          const response = await kbnClient.request({
            method: 'DELETE',
            path: `${buildSpacePath(spaceId)}/api/cases`,
            retries: 3,
            query: { ids: JSON.stringify(caseIds) },
            ignoreErrors: [404],
          });
          return { status: response.status };
        });
      },
      deleteCasesByTags: async (tags, spaceId) => {
        return await measurePerformanceAsync(
          log,
          `casesApi.cleanup.deleteCasesByTags [${tags.join(',')}]`,
          async () => {
            const caseIds = await findCaseIds(spaceId, { tags: tags.join(',') });
            if (caseIds.length === 0) return { status: 200 };
            const response = await kbnClient.request({
              method: 'DELETE',
              path: `${buildSpacePath(spaceId)}/api/cases`,
              retries: 3,
              query: { ids: JSON.stringify(caseIds) },
              ignoreErrors: [404],
            });
            return { status: response.status };
          }
        );
      },
    },
  };
};
