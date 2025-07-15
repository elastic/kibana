import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EsWorkflowSchema, WorkflowListModel } from '@kbn/workflows';

type SearchWorkflowsParams = {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  _full?: boolean;
};

export const searchWorkflows = async ({
  esClient,
  logger,
  workflowIndex,
  _full,
}: SearchWorkflowsParams) => {
  try {
    logger.info(`Searching workflows in index ${workflowIndex}`);
    const response = await esClient.search<EsWorkflowSchema>({
      index: workflowIndex,
      query: { match_all: {} },
    });

    logger.info(
      `Found ${response.hits.hits.length} workflows, ${response.hits.hits.map((hit) => hit._id)}`
    );

    if (_full) {
      return transformToWorkflowListModel(response);
    }

    return transformToWorkflowListItemModel(response);
  } catch (error) {
    logger.error(`Failed to search workflows: ${error}`);
    throw error;
  }
};

function transformToWorkflowListModel(
  response: SearchResponse<EsWorkflowSchema>
): WorkflowListModel {
  return {
    results: response.hits.hits.map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const workflowSchema = hit._source!;
      return {
        id: hit._id!,
        name: workflowSchema.name,
        description: workflowSchema.description,
        createdAt: workflowSchema.createdAt,
        status: workflowSchema.status,
        triggers: workflowSchema.triggers,
        tags: workflowSchema.tags ?? [],
        history: [],
        createdBy: workflowSchema.createdBy,
        lastUpdatedAt: workflowSchema.lastUpdatedAt,
        lastUpdatedBy: workflowSchema.lastUpdatedBy,
        steps: workflowSchema.steps,
        nodes: workflowSchema.nodes,
      };
    }),
    _pagination: {
      limit: response.hits.hits.length,
      offset: 0,
      total: response.hits.hits.length,
    },
  };
}

function transformToWorkflowListItemModel(
  response: SearchResponse<EsWorkflowSchema>
): WorkflowListModel {
  const workflows = response.hits.hits.map((hit) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workflowSchema = hit._source!;
    return {
      id: hit._id,
      name: workflowSchema.name,
      description: workflowSchema.description,
      createdAt: workflowSchema.createdAt,
      status: workflowSchema.status,
      triggers: workflowSchema.triggers,
      tags: workflowSchema.tags ?? [],
      history: [],
      createdBy: workflowSchema.createdBy,
      lastUpdatedAt: workflowSchema.lastUpdatedAt,
      lastUpdatedBy: workflowSchema.lastUpdatedBy,
    };
  });

  return {
    results: workflows,
    _pagination: {
      limit: response.hits.hits.length,
      offset: 0,
      total: response.hits.hits.length,
    },
  };
}
