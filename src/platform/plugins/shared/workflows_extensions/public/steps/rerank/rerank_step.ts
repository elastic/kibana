/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { rerankStepCommonDefinition, RerankStepTypeId } from '../../../common/steps/rerank';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const rerankStepDefinition: PublicStepDefinition = {
  ...rerankStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sortable').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.rerankStep.label', {
    defaultMessage: 'Rerank Results',
  }),
  description: i18n.translate('workflowsExtensions.rerankStep.description', {
    defaultMessage:
      'Rerank documents using Elasticsearch inference rerank endpoint for improved relevance ordering',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.rerankStep.documentation.details', {
      defaultMessage: `The rerank step calls the Elasticsearch rerank inference endpoint to reorder documents based on relevance to a rerank query.

**How it works:**
• Takes an array of documents and a rerank query
• Optionally limits reranking to first N documents via rank_window_size parameter
• Calls the /_inference/rerank/{model_id} endpoint with the rank window
• Returns reranked window + remaining documents in original order

**Data handling:**
• If fields parameter provided: extracts and concatenates specified fields for reranking
• If data contains objects without fields: stringifies objects
• If data contains strings: passes them through directly
• Always returns original full documents in reranked order

**Inference endpoint selection:**
• If inference_id provided: uses the specified endpoint
• If inference_id omitted: automatically discovers and selects the first available rerank endpoint, prioritizing Elastic-hosted models over self-hosted Elasticsearch models
• At least one rerank inference endpoint must exist in Elasticsearch

This encapsulates the Elasticsearch rerank API call for easy use in workflows.`,
    }),
    examples: [
      `## Basic usage with rank window
\`\`\`yaml
# Rerank only top 50 results to save on inference costs
- name: rerank_search_results
  type: ${RerankStepTypeId}
  with:
    rerank_query: "What is the best laptop?"
    data: \${{ steps.search.output }}
    rank_window_size: 50
    inference_id: "my-rerank-model"
\`\`\``,
      `## Reranking with field extraction
\`\`\`yaml
# Extract only title and content fields for reranking
# Rerank top 20 from 100 search results
- name: rerank_docs
  type: ${RerankStepTypeId}
  with:
    rerank_query: "{{ inputs.question }}"
    data: \${{ steps.fetch_docs.output }}
    fields:
      - ["title"]
      - ["content"]
    rank_window_size: 20
\`\`\``,
      `## Rerank all documents (no window)
\`\`\`yaml
# Omit rank_window_size to rerank all documents
- name: rerank_messages
  type: ${RerankStepTypeId}
  with:
    rerank_query: "Find messages about deployment"
    data: \${{ steps.slack.output }}
    fields:
      - ["user", "name"]
      - ["text"]
    inference_id: "my-rerank-model"
\`\`\``,
    ],
  },
  actionsMenuGroup: ActionsMenuGroup.elasticsearch,
};
