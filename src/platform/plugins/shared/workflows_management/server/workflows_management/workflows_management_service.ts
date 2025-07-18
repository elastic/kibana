/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  transformWorkflowYamlJsontoEsWorkflow,
  WorkflowExecutionDto,
  WorkflowListDto,
} from '@kbn/workflows';
import {
  CreateWorkflowCommand,
  EsWorkflow,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionListDto,
} from '@kbn/workflows';
import { getWorkflowExecution } from './lib/get_workflow_execution';
import { GetWorkflowsParams } from './workflows_management_api';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml-utils';
import { createIndexWithMappings } from './lib/create_index';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './lib/index_mappings';
import {
  WORKFLOW_SAVED_OBJECT_TYPE,
  WorkflowSavedObjectAttributes,
} from '../saved_objects/workflow';

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private logger: Logger;
  private getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private workflowsExecutionIndex: string;
  private stepsExecutionIndex: string;

  constructor(
    esClientPromise: Promise<ElasticsearchClient>,
    logger: Logger,
    getSavedObjectsClient: () => Promise<SavedObjectsClientContract>,
    workflowsExecutionIndex: string,
    stepsExecutionIndex: string
  ) {
    this.logger = logger;
    this.getSavedObjectsClient = getSavedObjectsClient;
    this.stepsExecutionIndex = stepsExecutionIndex;
    this.workflowsExecutionIndex = workflowsExecutionIndex;
    this.initialize(esClientPromise);
  }

  private async initialize(esClientPromise: Promise<ElasticsearchClient>) {
    this.esClient = await esClientPromise;
    this.logger.debug('Elasticsearch client initialized');

    // Create required indices with proper mappings (workflows are now saved objects)
    await Promise.all([
      createIndexWithMappings({
        esClient: this.esClient,
        indexName: this.workflowsExecutionIndex,
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
        logger: this.logger,
      }),
      createIndexWithMappings({
        esClient: this.esClient,
        indexName: this.stepsExecutionIndex,
        mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
        logger: this.logger,
      }),
    ]);

    this.logger.debug('Workflow execution indices initialized with proper mappings');
  }

  public async searchWorkflows(params: GetWorkflowsParams): Promise<WorkflowListDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const response = await savedObjectsClient.find<WorkflowSavedObjectAttributes>({
      type: WORKFLOW_SAVED_OBJECT_TYPE,
      perPage: 100,
      sortField: 'updated_at',
      sortOrder: 'desc',
    });

    const results = response.saved_objects.map((so) => ({
      id: so.id,
      name: so.attributes.name,
      description: so.attributes.description || '',
      status: so.attributes.status,
      tags: so.attributes.tags,
      createdAt: new Date(so.created_at!),
      createdBy: so.attributes.createdBy,
      lastUpdatedAt: new Date(so.updated_at!),
      lastUpdatedBy: so.attributes.lastUpdatedBy,
      definition: so.attributes.definition as any,
      history: [],
    }));

    return {
      results,
      _pagination: {
        offset: 0,
        limit: 100,
        total: response.total,
      },
    };
  }

  public async getWorkflowExecution(id: string): Promise<WorkflowExecutionDto | null> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await getWorkflowExecution({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: id,
    });
  }

  public async getWorkflow(id: string): Promise<WorkflowDetailDto | null> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    try {
      const response = await savedObjectsClient.get<WorkflowSavedObjectAttributes>(
        WORKFLOW_SAVED_OBJECT_TYPE,
        id
      );

      return {
        id: response.id,
        name: response.attributes.name,
        description: response.attributes.description,
        status: response.attributes.status,
        createdAt: new Date(response.created_at!),
        createdBy: response.attributes.createdBy,
        lastUpdatedAt: new Date(response.updated_at!),
        lastUpdatedBy: response.attributes.lastUpdatedBy,
        definition: response.attributes.definition as any,
        yaml: response.attributes.yaml,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  public async createWorkflow(workflow: CreateWorkflowCommand): Promise<WorkflowDetailDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (!parsedYaml.success) {
      throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
    }
    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);

    const savedObjectData: WorkflowSavedObjectAttributes = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      status: workflowToCreate.status,
      tags: workflowToCreate.tags || [],
      yaml: workflow.yaml,
      definition: workflowToCreate.definition,
      createdBy: 'system', // TODO: get from context
      lastUpdatedBy: 'system', // TODO: get from context
    };

    const response = await savedObjectsClient.create<WorkflowSavedObjectAttributes>(
      WORKFLOW_SAVED_OBJECT_TYPE,
      savedObjectData
    );

    return {
      id: response.id,
      name: response.attributes.name,
      description: response.attributes.description,
      status: response.attributes.status,
      createdAt: new Date(response.created_at!),
      createdBy: response.attributes.createdBy,
      lastUpdatedAt: new Date(response.updated_at!),
      lastUpdatedBy: response.attributes.lastUpdatedBy,
      definition: response.attributes.definition as any,
      yaml: response.attributes.yaml,
    };
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>
  ): Promise<UpdatedWorkflowResponseDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const { yaml, definition, ...rest } = workflow;

    let updateData: Partial<WorkflowSavedObjectAttributes>;

    if (yaml) {
      const parsedYaml = parseWorkflowYamlToJSON(yaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
      if (!parsedYaml.success) {
        throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
      }
      const updatedWorkflow = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);
      updateData = {
        name: updatedWorkflow.name,
        description: updatedWorkflow.description,
        status: updatedWorkflow.status,
        tags: updatedWorkflow.tags || [],
        yaml,
        definition: updatedWorkflow.definition,
        lastUpdatedBy: 'system', // TODO: get from context
      };
    } else {
      updateData = {
        ...rest,
        lastUpdatedBy: 'system', // TODO: get from context
      };
    }

    const response = await savedObjectsClient.update<WorkflowSavedObjectAttributes>(
      WORKFLOW_SAVED_OBJECT_TYPE,
      id,
      updateData
    );

    return {
      id: response.id,
      lastUpdatedAt: new Date(response.updated_at!),
      lastUpdatedBy: response.attributes.lastUpdatedBy,
    };
  }

  public async deleteWorkflows(workflowIds: string[]): Promise<void> {
    const savedObjectsClient = await this.getSavedObjectsClient();

    await Promise.all(
      workflowIds.map((id) => savedObjectsClient.delete(WORKFLOW_SAVED_OBJECT_TYPE, id))
    );
  }

  public async searchWorkflowExecutions(params: {
    workflowId: string;
  }): Promise<WorkflowExecutionListDto> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await searchWorkflowExecutions({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      query: { match: { workflowId: params.workflowId } },
    });
  }
}
