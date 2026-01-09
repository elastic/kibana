/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflow } from '../..';
import { WORKFLOW_INDEX_NAME } from '../constants';

export interface WorkflowRepositoryOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName?: string;
}

export class WorkflowRepository {
  constructor(private options: WorkflowRepositoryOptions) {
    this.options.indexName = this.options.indexName || WORKFLOW_INDEX_NAME;
  }

  /**
   * Get a workflow by ID and space ID
   */
  async getWorkflow(workflowId: string, spaceId: string): Promise<EsWorkflow | null> {
    try {
      const response = await this.options.esClient.search({
        index: this.options.indexName,
        query: {
          bool: {
            must: [{ ids: { values: [workflowId] } }, { term: { spaceId } }],
            must_not: {
              exists: { field: 'deleted_at' },
            },
          },
        },
        size: 1,
        track_total_hits: false,
      });

      if (response.hits.hits.length === 0) {
        return null;
      }

      const document = response.hits.hits[0];
      if (!document._source) {
        return null;
      }

      // Transform the stored document to EsWorkflow format
      const source = document._source as EsWorkflow;
      return {
        id: workflowId,
        name: source.name,
        description: source.description,
        enabled: source.enabled,
        tags: source.tags || [],
        valid: source.valid,
        createdAt: new Date(source.createdAt),
        createdBy: source.createdBy,
        lastUpdatedAt: new Date(source.lastUpdatedAt),
        lastUpdatedBy: source.lastUpdatedBy,
        definition: source.definition,
        deleted_at: source.deleted_at ? new Date(source.deleted_at) : null,
        yaml: source.yaml,
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      this.options.logger.error(`Failed to get workflow ${workflowId}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a workflow is enabled by ID and space ID
   */
  async isWorkflowEnabled(workflowId: string, spaceId: string): Promise<boolean> {
    try {
      const workflow = await this.getWorkflow(workflowId, spaceId);
      return workflow?.enabled ?? false;
    } catch (error) {
      this.options.logger.error(`Failed to check if workflow ${workflowId} is enabled: ${error}`);
      return false;
    }
  }
}
