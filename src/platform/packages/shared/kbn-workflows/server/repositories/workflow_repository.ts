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
    const map = await this.areWorkflowsEnabled([{ workflowId, spaceId }]);
    return map.get(`${spaceId}:${workflowId}`) ?? false;
  }

  /**
   * Bulk-check whether the given (workflowId, spaceId) pairs refer to enabled,
   * non-soft-deleted workflows. Runs a single `_search` fetching only the
   * `enabled` field across all requested ids.
   *
   * The returned map is keyed by `${spaceId}:${workflowId}`. Missing docs and
   * soft-deleted docs (`deleted_at` present) resolve to `false`.
   */
  async areWorkflowsEnabled(
    refs: Array<{ workflowId: string; spaceId: string }>
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    if (refs.length === 0) {
      return result;
    }

    const uniqueKeys = new Set<string>();
    const bySpace = new Map<string, Set<string>>();
    for (const { workflowId, spaceId } of refs) {
      const key = `${spaceId}:${workflowId}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        let ids = bySpace.get(spaceId);
        if (!ids) {
          ids = new Set<string>();
          bySpace.set(spaceId, ids);
        }
        ids.add(workflowId);
      }
    }

    const should = Array.from(bySpace.entries()).map(([spaceId, ids]) => ({
      bool: {
        must: [{ ids: { values: Array.from(ids) } }, { term: { spaceId } }],
      },
    }));

    try {
      const response = await this.options.esClient.search({
        index: this.options.indexName,
        _source: ['enabled', 'spaceId'],
        size: uniqueKeys.size,
        track_total_hits: false,
        query: {
          bool: {
            should,
            minimum_should_match: 1,
            must_not: { exists: { field: 'deleted_at' } },
          },
        },
      });

      for (const hit of response.hits.hits) {
        const source = hit._source as { enabled?: boolean; spaceId?: string } | undefined;
        if (source) {
          const key = `${source.spaceId}:${hit._id}`;
          result.set(key, source.enabled ?? false);
        }
      }
    } catch (error) {
      if (error.statusCode === 404) {
        return result;
      }
      this.options.logger.error(`Failed to bulk-check workflow enabled flags: ${error}`);
      throw error;
    }

    for (const key of uniqueKeys) {
      if (!result.has(key)) {
        result.set(key, false);
      }
    }

    return result;
  }
}
