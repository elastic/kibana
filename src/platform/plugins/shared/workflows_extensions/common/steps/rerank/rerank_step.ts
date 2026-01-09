/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Step type ID for the rerank workflow step
 */
export const RerankStepTypeId = 'workflows.rerank';

/**
 * Input schema for the rerank step
 * Validates parameters for calling the Elasticsearch rerank inference endpoint
 */
const RerankInputSchema = z.object({
  rerank_query: z.string().describe('Query text to rerank documents against'),
  data: z.array(z.any()).describe('Array of documents to rerank'),
  fields: z
    .array(z.array(z.string()))
    .optional()
    .describe(
      'Optional field paths to extract from each document for reranking. E.g., [["title"], ["content"]] extracts item.title and item.content'
    ),
  inference_id: z
    .string()
    .optional()
    .describe(
      'Rerank inference endpoint ID. If not provided, automatically selects the first available rerank endpoint from Elasticsearch, prioritizing Elastic-hosted models over self-hosted Elasticsearch models.'
    ),
  rank_window_size: z
    .number()
    .optional()
    .describe(
      'Number of documents from the start of the input array to send for reranking. Limits inference API costs by only reranking the top N documents. Remaining documents are appended to output in original order.'
    ),
});

/**
 * Output schema for the rerank step
 * Returns an array of reranked documents
 */
const RerankOutputSchema = z
  .array(z.any())
  .describe('Array of reranked documents in descending relevance order');

export type RerankInput = z.infer<typeof RerankInputSchema>;
export type RerankOutput = z.infer<typeof RerankOutputSchema>;

/**
 * Common step definition for rerank step
 * Shared between server and public implementations
 */
export const rerankStepCommonDefinition = {
  id: RerankStepTypeId,
  inputSchema: RerankInputSchema,
  outputSchema: RerankOutputSchema,
} as const;
