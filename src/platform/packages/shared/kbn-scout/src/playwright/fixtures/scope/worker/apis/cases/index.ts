/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Attachment, Case } from '@kbn/cases-plugin/common/types/domain';
import type {
  AttachmentRequest,
  CasePostRequest,
  CasesFindResponse,
  CasesPatchRequest,
} from '@kbn/cases-plugin/common/types/api';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ApiStatusResponse {
  status: number;
}

export interface CasesApiService {
  create: (params: CasePostRequest, spaceId?: string) => Promise<ApiResponse<Case>>;
  get: (caseId: string, spaceId?: string) => Promise<ApiResponse<Case>>;
  update: (request: CasesPatchRequest, spaceId?: string) => Promise<ApiResponse<Case[]>>;
  delete: (caseIds: string[], spaceId?: string) => Promise<ApiStatusResponse>;
  find: (
    searchParams?: Record<string, any>,
    spaceId?: string
  ) => Promise<ApiResponse<CasesFindResponse>>;
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

  const findAllCaseIds = async (
    query: Record<string, any>,
    spaceId?: string
  ): Promise<string[]> => {
    let allCaseIds: string[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const response = await kbnClient.request({
        method: 'GET',
        path: `${buildSpacePath(spaceId)}/api/cases/_find`,
        retries: 3,
        query: { ...query, page, perPage: 100 },
      });
      const casesData = response.data as CasesFindResponse;
      if (casesData.cases?.length > 0) {
        allCaseIds = allCaseIds.concat(casesData.cases.map((c) => c.id));
        hasMore = allCaseIds.length < casesData.total;
        page++;
      } else {
        hasMore = false;
      }
    }
    return allCaseIds;
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
    update: async (request, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `casesApi.cases.update [${request.cases.length} cases]`,
        async () => {
          const response = await kbnClient.request({
            method: 'PATCH',
            path: `${buildSpacePath(spaceId)}/api/cases`,
            retries: 3,
            body: request,
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
    find: async (searchParams, spaceId) => {
      return await measurePerformanceAsync(log, 'casesApi.cases.find', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `${buildSpacePath(spaceId)}/api/cases/_find`,
          retries: 3,
          query: searchParams,
        });
        return { data: response.data as CasesFindResponse, status: response.status };
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
          const caseIds = await findAllCaseIds({}, spaceId);
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
            const caseIds = await findAllCaseIds({ tags: tags.join(',') }, spaceId);
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
