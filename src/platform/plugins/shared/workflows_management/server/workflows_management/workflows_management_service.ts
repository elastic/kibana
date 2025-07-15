/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WorkflowListModel, WorkflowModel } from '@kbn/workflows';
import { getWorkflow } from './lib/get_workflow';
import { createWorkflow } from './lib/create_workflow';
import { GetWorkflowsParams } from './workflows_management_api';
import { searchWorkflows } from './lib/search_workflows';
import { updateWorkflow } from './lib/update_workflow';

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private logger: Logger;
  private workflowIndex: string;

  constructor(
    esClientPromise: Promise<ElasticsearchClient>,
    logger: Logger,
    workflowIndex: string
  ) {
    this.logger = logger;
    this.workflowIndex = workflowIndex;
    this.initialize(esClientPromise);
  }

  private async initialize(esClientPromise: Promise<ElasticsearchClient>) {
    this.esClient = await esClientPromise;
    this.logger.debug('Elasticsearch client initialized');
    const indices = await this.esClient.indices.exists({
      index: this.workflowIndex,
    });
    if (!indices) {
      this.logger.debug(`Workflow index ${this.workflowIndex} does not exist`);
      this.esClient.indices.create({
        index: this.workflowIndex,
      });
      this.logger.debug(`Workflow index ${this.workflowIndex} created`);
    }
    this.logger.debug(`Workflow index ${this.workflowIndex} exists`);
  }

  public async searchWorkflows(params: GetWorkflowsParams): Promise<WorkflowListModel> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await searchWorkflows({
      esClient: this.esClient,
      logger: this.logger,
      workflowIndex: this.workflowIndex,
      _full: params._full,
    });
  }

  public async getWorkflow(id: string): Promise<WorkflowModel | null> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await getWorkflow({
      esClient: this.esClient,
      logger: this.logger,
      workflowIndex: this.workflowIndex,
      workflowId: id,
    });
  }

  public async createWorkflow(workflow: WorkflowModel): Promise<WorkflowModel> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await createWorkflow({
      esClient: this.esClient,
      logger: this.logger,
      workflowIndex: this.workflowIndex,
      workflow,
    });
  }

  public async updateWorkflow(id: string, workflow: WorkflowModel): Promise<WorkflowModel> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await updateWorkflow({
      esClient: this.esClient,
      logger: this.logger,
      workflowIndex: this.workflowIndex,
      workflowId: id,
      workflow,
    });
  }
}
