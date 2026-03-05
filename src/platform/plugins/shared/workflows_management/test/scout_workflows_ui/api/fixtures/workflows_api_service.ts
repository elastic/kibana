/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { COMMON_HEADERS, WORKFLOWS_API_BASE } from './constants';

interface ApiClientOptions {
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
  body?: unknown;
}

interface ApiClientResponse {
  statusCode: number;
  body: Record<string, unknown>;
  headers: Record<string, string | string[]>;
}

interface ApiClient {
  get(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  post(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  put(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  delete(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
}

interface GetWorkflowExecutionOptions {
  includeInput?: boolean;
  includeOutput?: boolean;
}

export class WorkflowsApiService {
  private readonly headers: Record<string, string>;

  constructor(private readonly apiClient: ApiClient, credentials: RoleApiCredentials) {
    this.headers = { ...COMMON_HEADERS, ...credentials.apiKeyHeader };
  }

  async create(yaml: string): Promise<{ id: string }> {
    return this.apiClient
      .post(WORKFLOWS_API_BASE, {
        headers: this.headers,
        responseType: 'json',
        body: { yaml },
      })
      .then((response) => response.body as { id: string });
  }

  async run({
    id,
    inputs,
  }: {
    id: string;
    inputs: Record<string, unknown>;
  }): Promise<{ workflowExecutionId: string }> {
    return this.apiClient
      .post(`${WORKFLOWS_API_BASE}/${id}/run`, {
        headers: this.headers,
        responseType: 'json',
        body: { inputs },
      })
      .then((response) => response.body as { workflowExecutionId: string });
  }

  async waitForTermination({
    workflowExecutionId,
  }: {
    workflowExecutionId: string;
  }): Promise<WorkflowExecutionDto | undefined> {
    for (let i = 0; i < 20; i++) {
      const execution = await this.getExecution(workflowExecutionId);
      if (execution && isTerminalStatus(execution.status)) {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return this.getExecution(workflowExecutionId);
  }

  async getExecution(
    workflowExecutionId: string,
    options: GetWorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionDto | undefined> {
    const { includeInput = false, includeOutput = false } = options;
    return this.apiClient
      .get(
        `api/workflowExecutions/${workflowExecutionId}?includeInput=${includeInput}&includeOutput=${includeOutput}`,
        {
          headers: this.headers,
          responseType: 'json',
        }
      )
      .then((response) =>
        response.body ? (response.body as unknown as WorkflowExecutionDto) : undefined
      );
  }

  async update(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.apiClient
      .put(`${WORKFLOWS_API_BASE}/${id}`, {
        headers: this.headers,
        responseType: 'json',
        body,
      })
      .then((response) => response.body as Record<string, unknown>);
  }

  async getExecutions(workflowId: string, options: { size?: number; page?: number } = {}) {
    const { size = 100, page = 1 } = options;
    return this.apiClient
      .get(`api/workflowExecutions?workflowId=${workflowId}&size=${size}&page=${page}`, {
        headers: this.headers,
        responseType: 'json',
      })
      .then(
        (response) =>
          response.body as { results: WorkflowExecutionDto[]; total: number; page: number }
      );
  }

  async bulkDelete(ids: string[]) {
    return this.apiClient.delete(WORKFLOWS_API_BASE, {
      headers: this.headers,
      responseType: 'json',
      body: { ids },
    });
  }

  async deleteAll() {
    const response = await this.apiClient.post(`${WORKFLOWS_API_BASE}/search`, {
      headers: this.headers,
      responseType: 'json',
      body: { size: 10000, page: 1 },
    });

    const workflowIds =
      (response.body as { results?: Array<{ id: string }> }).results?.map((w) => w.id) || [];
    if (workflowIds.length > 0) {
      await this.apiClient.delete(WORKFLOWS_API_BASE, {
        headers: this.headers,
        responseType: 'json',
        body: { ids: workflowIds },
      });
    }
  }
}
