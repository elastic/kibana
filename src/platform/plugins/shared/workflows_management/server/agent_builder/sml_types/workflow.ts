/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SmlTypeDefinition } from './types';
import {
  WORKFLOW_SML_TYPE,
  WORKFLOW_YAML_ATTACHMENT_TYPE,
} from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import { workflowIndexName, type WorkflowProperties } from '../../storage/workflow_storage';

const indexPattern = `${workflowIndexName}-*`;

const buildSearchContent = (source: WorkflowProperties): string => {
  const parts: Array<string | undefined> = [
    source.name,
    source.description,
    source.tags?.length ? `tags: ${source.tags.join(', ')}` : undefined,
    source.enabled !== undefined ? `enabled: ${source.enabled}` : undefined,
    source.triggerTypes?.length ? `triggers: ${source.triggerTypes.join(', ')}` : undefined,
  ];
  return parts.filter(Boolean).join('\n');
};

export const createWorkflowSmlType = (api: WorkflowsManagementApi): SmlTypeDefinition => ({
  id: WORKFLOW_SML_TYPE,
  fetchFrequency: () => '30m',

  async *list(context) {
    const pageSize = 1000;
    let searchAfter: SortResults | undefined;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await context.esClient.search<WorkflowProperties>({
          index: indexPattern,
          size: pageSize,
          _source: ['spaceId', 'updated_at'],
          query: {
            bool: {
              must_not: [{ exists: { field: 'deleted_at' } }],
            },
          },
          sort: [{ updated_at: { order: 'desc' } }, '_shard_doc'],
          ...(searchAfter ? { search_after: searchAfter } : {}),
          ignore_unavailable: true,
        });

        const hits = response.hits.hits;
        if (hits.length > 0) {
          yield hits
            .filter(
              (hit): hit is typeof hit & { _id: string; _source: WorkflowProperties } =>
                Boolean(hit._id) && Boolean(hit._source)
            )
            .map((hit) => ({
              id: hit._id,
              updatedAt: hit._source.updated_at ?? new Date().toISOString(),
              spaces: [hit._source.spaceId],
            }));
        }

        hasMore = hits.length >= pageSize;
        if (hasMore && hits.length > 0) {
          const lastHit = hits[hits.length - 1];
          searchAfter = lastHit.sort;
        }
      } catch (error) {
        context.logger.warn(`SML workflow: failed to list workflows: ${(error as Error).message}`);
        return;
      }
    }
  },

  getSmlData: async (originId, context) => {
    try {
      const response = await context.esClient.search<WorkflowProperties>({
        index: indexPattern,
        query: {
          bool: {
            must: [{ ids: { values: [originId] } }],
            must_not: [{ exists: { field: 'deleted_at' } }],
          },
        },
        _source: ['name', 'description', 'tags', 'enabled', 'triggerTypes'],
        size: 1,
        ignore_unavailable: true,
      });

      const hit = response.hits.hits[0];
      if (!hit?._source) return undefined;

      const source = hit._source;
      const title = source.name ?? originId;

      return {
        chunks: [
          {
            type: WORKFLOW_SML_TYPE,
            title,
            content: buildSearchContent(source),
            permissions: ['api:workflowsManagement:read'],
          },
        ],
      };
    } catch (error) {
      context.logger.warn(
        `SML workflow: failed to get data for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  toAttachment: async (item, context) => {
    const workflow = await api.getWorkflow(item.origin_id, context.spaceId);
    if (!workflow) return undefined;

    return {
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      data: {
        yaml: workflow.yaml,
        workflowId: workflow.id,
        name: workflow.name,
      },
    };
  },
});
