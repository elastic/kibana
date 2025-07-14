import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WorkflowModel } from '@kbn/workflows';
import { v4 as uuidv4 } from 'uuid';
import { getWorkflow } from './get_workflow';

type CreateWorkflowParams = {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflow: WorkflowModel;
};

export const createWorkflow = async ({
  esClient,
  logger,
  workflowIndex,
  workflow,
}: CreateWorkflowParams) => {
  const workflowId = uuidv4();
  const document = transformToCreateScheme(workflow);

  try {
    const response = await esClient.create({
      id: workflowId,
      index: 'workflows',
      document,
      refresh: 'wait_for',
    });

    const createdWorkflow = await getWorkflow({
      esClient,
      logger,
      workflowIndex,
      workflowId: response._id,
    });

    return createdWorkflow;
  } catch (error) {
    logger.error(`Failed to create workflow: ${error}`);
    throw error;
  }
};

function transformToCreateScheme(workflow: WorkflowModel) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
  };
}
