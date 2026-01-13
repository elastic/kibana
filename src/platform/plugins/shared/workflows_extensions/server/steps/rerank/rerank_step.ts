/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { rerankStepCommonDefinition } from '../../../common/steps/rerank';
import { createServerStepDefinition } from '../../step_registry/types';

interface InferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: Record<string, unknown>;
  task_settings?: Record<string, unknown>;
}

/**
 * Find available rerank inference endpoints to default to if none is provided.
 * Prioritizes Elastic-hosted models over self-hosted Elasticsearch models.
 * Returns null if no endpoints are found or if an error occurs.
 */
async function discoverRerankEndpoint(
  esClient: ElasticsearchClient,
  logger: Pick<Logger, 'debug'>
): Promise<string | null> {
  try {
    const { endpoints } = await esClient.inference.get({
      inference_id: '_all',
      task_type: 'rerank',
    });

    if (!endpoints || endpoints.length === 0) {
      return null;
    }

    const rerankEndpoints = endpoints as InferenceEndpoint[];

    // Priority 1: EIS-hosted rerank models
    const elasticRerank = rerankEndpoints.find((ep) => ep.service === 'elastic');
    if (elasticRerank) {
      return elasticRerank.inference_id;
    }

    // Priority 2: Self-hosted Elasticsearch rerank models
    const elasticsearchRerank = rerankEndpoints.find((ep) => ep.service === 'elasticsearch');
    if (elasticsearchRerank) {
      return elasticsearchRerank.inference_id;
    }

    // Fallback: Return first available rerank endpoint
    return rerankEndpoints[0].inference_id;
  } catch (error) {
    logger.debug('Failed to discover rerank endpoints', error);
    return null;
  }
}

/**
 * Extract a value from an object using a path like ["user", "name"]
 */
function getValueAtPath(obj: unknown, path: string[]): string {
  let value: unknown = obj;
  for (const key of path) {
    if (value && typeof value === 'object' && value !== null) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return '';
    }
  }
  return value != null ? String(value) : '';
}

function extractFieldsFromDocument(doc: unknown, fieldPaths: string[][]): string {
  const values = fieldPaths.map((path) => getValueAtPath(doc, path)).filter((v) => v.length > 0);
  return values.join(' ');
}

/**
 * Rerank step server-side definition
 *
 * Calls the Elasticsearch rerank inference endpoint to reorder documents
 * based on relevance to a user question.
 */
export const rerankStepDefinition = createServerStepDefinition({
  ...rerankStepCommonDefinition,
  handler: async (context) => {
    try {
      const esClient = context.contextManager.getScopedEsClient();

      context.logger.info('Rerank step started', {
        rerankQuery: context.input.rerank_text,
        dataLength: Array.isArray(context.input.data) ? context.input.data.length : 0,
        inferenceId: context.input.inference_id,
        hasFieldExtraction: !!context.input.fields,
        rankWindowSize: context.input.rank_window_size,
      });

      if (!Array.isArray(context.input.data) || context.input.data.length === 0) {
        context.logger.warn('No data to rerank');
        return { output: [] };
      }

      // Split data into rank window and remainder
      const rankWindowSize = context.input.rank_window_size;
      const dataToRerank = rankWindowSize
        ? context.input.data.slice(0, rankWindowSize)
        : context.input.data;
      const remainingData = rankWindowSize ? context.input.data.slice(rankWindowSize) : [];

      // Prepare input for rerank endpoint
      let inputForRerank: string[];
      if (context.input.fields && context.input.fields.length > 0) {
        // Extract specified fields and concatenate into strings
        inputForRerank = dataToRerank.map((doc) =>
          extractFieldsFromDocument(doc, context.input.fields || [])
        );
      } else {
        // Stringify objects or pass strings through
        inputForRerank = dataToRerank.map((doc) =>
          typeof doc === 'string' ? doc : JSON.stringify(doc)
        );
      }

      let inferenceId: string | null | undefined = context.input.inference_id;
      if (!inferenceId) {
        context.logger.info('No inference_id provided, discovering available rerank endpoints');
        inferenceId = await discoverRerankEndpoint(esClient, context.logger);

        if (!inferenceId) {
          throw new Error(
            'No inference_id provided and no rerank inference endpoints found in Elasticsearch. ' +
              'Please create a rerank inference endpoint or specify an inference_id explicitly.'
          );
        }

        context.logger.info(
          `No inference endpoint ID passed for rerank step - defaulting to discovered endpoint: ${inferenceId}`
        );
      }

      const response = await esClient.inference.inference({
        inference_id: inferenceId,
        task_type: 'rerank',
        query: context.input.rerank_text,
        input: inputForRerank,
        timeout: '5m',
      });

      // Extract reranked results from response
      // Response format: { rerank: [{ index: 0, relevance_score: 0.95, text: "..." }, ...] }
      const rerankResponse = response?.rerank;

      if (!rerankResponse || !Array.isArray(rerankResponse)) {
        const errorDetails = {
          hasRerank: !!rerankResponse,
          rerankType: typeof rerankResponse,
        };
        context.logger.error(
          `Rerank API returned unexpected response format: ${JSON.stringify(errorDetails)}`
        );
        throw new Error(
          'Rerank API returned unexpected response format. Expected an array of reranked results.'
        );
      }

      // Use the index field to reorder documents from the rank window
      const rerankedDocuments = rerankResponse.map(
        (item: { index: number; relevance_score?: number; text?: string }) =>
          dataToRerank[item.index]
      );
      // Combine reranked window with remaining documents
      const output = [...rerankedDocuments, ...remainingData];

      context.logger.info('Rerank step completed', {
        inputCount: context.input.data.length,
        rerankedCount: rerankedDocuments.length,
        remainingCount: remainingData.length,
        outputCount: output.length,
        inferenceId,
      });

      return { output };
    } catch (error) {
      context.logger.error('Rerank step failed', error as Error);
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
