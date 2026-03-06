/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient } from '@kbn/scout';

export interface WorkflowDetailDto {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  yaml: string;
  valid: boolean;
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
}

export interface BulkCreateResult {
  created: WorkflowDetailDto[];
  failed: Array<{ index: number; error: string }>;
}

export interface WorkflowsApiService {
  /** POST /api/workflows — create a single workflow from YAML. */
  create: (spaceId: string, yaml: string) => Promise<WorkflowDetailDto>;
  /** POST /api/workflows/_bulk_create — create multiple workflows at once. */
  bulkCreate: (spaceId: string, yamls: string[]) => Promise<BulkCreateResult>;
  /** PUT /api/workflows/{id} — partially update a workflow (e.g. toggle enabled). */
  update: (
    spaceId: string,
    id: string,
    body: Partial<Pick<WorkflowDetailDto, 'name' | 'description' | 'enabled' | 'yaml'>>
  ) => Promise<WorkflowDetailDto>;
  /** DELETE /api/workflows — delete workflows by IDs. */
  bulkDelete: (spaceId: string, ids: string[]) => Promise<void>;
  /** POST /api/workflows/search + DELETE — delete all workflows in a space. */
  deleteAll: (spaceId: string) => Promise<void>;
}

export const getWorkflowsApiService = (kbnClient: KbnClient): WorkflowsApiService => {
  return {
    create: async (spaceId: string, yaml: string): Promise<WorkflowDetailDto> => {
      const response = await kbnClient.request<WorkflowDetailDto>({
        method: 'POST',
        path: `/s/${spaceId}/api/workflows`,
        body: { yaml },
      });
      return response.data;
    },

    update: async (
      spaceId: string,
      id: string,
      body: Partial<Pick<WorkflowDetailDto, 'name' | 'description' | 'enabled' | 'yaml'>>
    ): Promise<WorkflowDetailDto> => {
      const response = await kbnClient.request<WorkflowDetailDto>({
        method: 'PUT',
        path: `/s/${spaceId}/api/workflows/${id}`,
        body,
      });
      return response.data;
    },

    bulkCreate: async (spaceId: string, yamls: string[]): Promise<BulkCreateResult> => {
      const response = await kbnClient.request<BulkCreateResult>({
        method: 'POST',
        path: `/s/${spaceId}/api/workflows/_bulk_create`,
        body: { workflows: yamls.map((yaml) => ({ yaml })) },
      });
      return response.data;
    },

    bulkDelete: async (spaceId: string, ids: string[]): Promise<void> => {
      if (ids.length > 0) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/s/${spaceId}/api/workflows`,
          body: { ids },
        });
      }
    },

    deleteAll: async (spaceId: string): Promise<void> => {
      const response = await kbnClient.request<{ results?: Array<{ id: string }> }>({
        method: 'POST',
        path: `/s/${spaceId}/api/workflows/search`,
        body: { size: 10000, page: 1 },
      });

      const workflowIds = response.data.results?.map((w) => w.id) || [];
      if (workflowIds.length > 0) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/s/${spaceId}/api/workflows`,
          body: { ids: workflowIds },
        });
      }
    },
  };
};
