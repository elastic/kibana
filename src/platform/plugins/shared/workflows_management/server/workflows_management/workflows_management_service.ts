import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getWorkflow } from './lib/get_workflow';
import { WorkflowListModel, WorkflowModel, WorkflowStepExecution } from '@kbn/workflows';
import { createWorkflow } from './lib/create_workflow';
import { GetWorkflowsParams } from './workflows_management_api';
import { searchWorkflows, searchStepExecutions } from './lib/search_workflows';

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private logger: Logger;
  private workflowIndex: string;
  private stepsExecutionIndex: string;

  constructor(
    esClientPromise: Promise<ElasticsearchClient>,
    logger: Logger,
    workflowIndex: string,
    stepsExecutionIndex: string
  ) {
    this.logger = logger;
    this.workflowIndex = workflowIndex;
    this.stepsExecutionIndex = stepsExecutionIndex;
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

  public async searchStepExecutions(params: {
    workflowExecutionId: string;
  }): Promise<WorkflowStepExecution[]> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await searchStepExecutions({
      esClient: this.esClient,
      logger: this.logger,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: params.workflowExecutionId,
    });
  }

  public async getWorkflow(id: string): Promise<WorkflowModel | null> {
    return await getWorkflow({
      esClient: this.esClient,
      logger: this.logger,
      workflowIndex: this.workflowIndex,
      workflowId: id,
    });
  }

  public async createWorkflow(workflow: WorkflowModel): Promise<WorkflowModel> {
    return await createWorkflow({
      esClient: this.esClient,
      logger: this.logger,
      workflowIndex: this.workflowIndex,
      workflow,
    });
  }
}
