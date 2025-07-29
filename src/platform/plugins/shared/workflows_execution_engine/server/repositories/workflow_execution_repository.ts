/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { EsWorkflowExecution } from '@kbn/workflows';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

export class WorkflowExecutionRepository {
  private indexName = WORKFLOWS_EXECUTIONS_INDEX;
  constructor(private esClient: ElasticsearchClient) {}

  public async createWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<void> {
    await this.esClient.index({
      index: this.indexName,
      id: workflowExecution.id,
      refresh: true,
      document: workflowExecution,
    });
  }

  public async updateWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<void> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for update');
    }

    await this.esClient.index({
      index: this.indexName,
      id: workflowExecution.id,
      refresh: true,
      document: workflowExecution,
    });
  }
}
