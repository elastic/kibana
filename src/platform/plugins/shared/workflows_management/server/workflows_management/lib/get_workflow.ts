import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EsWorkflowSchema } from '@kbn/workflows/types/v1';

type GetWorkflowParams = {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflowId: string;
};

export const getWorkflow = async ({
  esClient,
  logger,
  workflowIndex,
  workflowId,
}: GetWorkflowParams) => {
  try {
    const response = await esClient.search<EsWorkflowSchema>({
      index: workflowIndex,
      query: {
        match: {
          _id: workflowId,
        },
      },
    });

    return transformToWorkflowModel(response);
  } catch (error) {
    logger.error(`Failed to get workflow: ${error}`);
    throw error;
  }
};

function transformToWorkflowModel(response: SearchResponse<EsWorkflowSchema>) {
  return (
    response.hits.hits.map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const workflowSchema = hit._source!;
      return {
        id: workflowSchema.id,
        name: workflowSchema.name,
        description: workflowSchema.description,
        status: workflowSchema.status,
        triggers: workflowSchema.triggers,
        steps: workflowSchema.steps,
        nodes: workflowSchema.nodes,
      };
    })[0] ?? null
  );
}
