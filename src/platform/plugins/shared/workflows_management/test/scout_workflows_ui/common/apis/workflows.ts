/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type KbnClient } from '@kbn/scout';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { waitForConditionOrThrow } from '../utils/wait_for_condition';

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

interface GetWorkflowExecutionOptions {
  includeInput?: boolean;
  includeOutput?: boolean;
}

export class WorkflowsApiService {
  constructor(private readonly spaceId: string, private readonly kbnClient: KbnClient) {}

  /** POST /api/workflows — create a single workflow from YAML. */
  async create(yaml: string): Promise<WorkflowDetailDto> {
    const response = await this.kbnClient.request<WorkflowDetailDto>({
      method: 'POST',
      path: `/s/${this.spaceId}/api/workflows`,
      body: { yaml },
    });
    return response.data;
  }

  /** POST /api/workflows/_bulk_create — create multiple workflows at once. */
  async bulkCreate(yamls: string[]): Promise<BulkCreateResult> {
    const response = await this.kbnClient.request<BulkCreateResult>({
      method: 'POST',
      path: `/s/${this.spaceId}/api/workflows/_bulk_create`,
      body: { workflows: yamls.map((y) => ({ yaml: y })) },
    });
    return response.data;
  }

  /** PUT /api/workflows/{id} — partially update a workflow (e.g. toggle enabled). */
  async update(
    id: string,
    body: Partial<Pick<WorkflowDetailDto, 'name' | 'description' | 'enabled' | 'yaml'>>
  ): Promise<WorkflowDetailDto> {
    const response = await this.kbnClient.request<WorkflowDetailDto>({
      method: 'PUT',
      path: `/s/${this.spaceId}/api/workflows/${id}`,
      body,
    });
    return response.data;
  }

  /** DELETE /api/workflows — delete workflows by IDs. */
  async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length > 0) {
      await this.kbnClient.request({
        method: 'DELETE',
        path: `/s/${this.spaceId}/api/workflows`,
        body: { ids },
      });
    }
  }

  /** POST /api/workflows/search + DELETE — delete all workflows in a space. */
  async deleteAll(): Promise<void> {
    const response = await this.kbnClient.request<{ results?: Array<{ id: string }> }>({
      method: 'POST',
      path: `/s/${this.spaceId}/api/workflows/search`,
      body: { size: 10000, page: 1 },
    });

    const workflowIds = response.data.results?.map((w) => w.id) || [];
    if (workflowIds.length > 0) {
      await this.kbnClient.request({
        method: 'DELETE',
        path: `/s/${this.spaceId}/api/workflows`,
        body: { ids: workflowIds },
      });
    }
  }

  async run(id: string, inputs: Record<string, unknown>): Promise<{ workflowExecutionId: string }> {
    const response = await this.kbnClient.request<{ workflowExecutionId: string }>({
      method: 'POST',
      path: `/s/${this.spaceId}/api/workflows/${id}/run`,
      body: { inputs },
    });
    return response.data;
  }

  async getExecution(
    workflowExecutionId: string,
    options: GetWorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionDto | undefined> {
    const { includeInput = false, includeOutput = false } = options;
    const response = await this.kbnClient.request<WorkflowExecutionDto>({
      method: 'GET',
      path: `/s/${this.spaceId}/api/workflowExecutions/${workflowExecutionId}?includeInput=${includeInput}&includeOutput=${includeOutput}`,
    });
    return response.data;
  }

  async getExecutions(
    workflowId: string,
    options: { size?: number; page?: number } = {}
  ): Promise<{ results: WorkflowExecutionDto[]; total: number; page: number }> {
    const { size = 100, page = 1 } = options;
    const response = await this.kbnClient.request<{
      results: WorkflowExecutionDto[];
      total: number;
      page: number;
    }>({
      method: 'GET',
      path: `/s/${this.spaceId}/api/workflowExecutions?workflowId=${workflowId}&size=${size}&page=${page}`,
    });
    return response.data;
  }

  async waitForTermination({
    workflowExecutionId,
  }: {
    workflowExecutionId: string;
  }): Promise<WorkflowExecutionDto | undefined> {
    return waitForConditionOrThrow({
      action: () => this.getExecution(workflowExecutionId),
      condition: (execution) => !!execution && isTerminalStatus(execution.status ?? ''),
      interval: 1000,
      timeout: 20_000,
      errorMessage: `Execution with id ${workflowExecutionId} did not reach a terminal status`,
    });
  }
}
