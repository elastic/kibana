/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election.
 */
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const ElasticsearchBulkStepTypeId = 'elasticsearch.bulk' as const;

export const ElasticsearchBulkInputSchema = z.object({
  index: z.string().min(1),
  documents: z.array(z.record(z.string(), z.unknown())).min(1),
  batch_size: z.number().int().min(1).max(10000).optional(),
  require_refresh: z.boolean().optional(),
});

export const ElasticsearchBulkOutputSchema = z.object({
  indexed: z.number().int().min(0),
  failed: z.number().int().min(0),
  batches: z.number().int().min(0),
});

export const ElasticsearchBulkConfigSchema = z.object({});

export const elasticsearchBulkStepCommonDefinition: CommonStepDefinition<
  typeof ElasticsearchBulkInputSchema,
  typeof ElasticsearchBulkOutputSchema,
  typeof ElasticsearchBulkConfigSchema
> = {
  id: ElasticsearchBulkStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('workflowsExtensions.elasticsearchBulkStep.label', {
    defaultMessage: 'Bulk index',
  }),
  description: i18n.translate('workflowsExtensions.elasticsearchBulkStep.description', {
    defaultMessage: 'Index an array of documents into Elasticsearch in batches via _bulk',
  }),
  documentation: {
    details: `Takes an inline array of documents and indexes them into the target index using the
Elasticsearch _bulk API, in configurable batches (default 500). Partial failures within
a batch are reported in step output; the step fails when any item errors unless
all batches error, in which case the step errors.

\`\`\`yaml
- name: upsert_pages
  type: elasticsearch.bulk
  with:
    index: github-intel-projects
    documents: "{{ steps.map_pages.output }}"
    batch_size: 500
\`\`\``,
  },
  inputSchema: ElasticsearchBulkInputSchema,
  outputSchema: ElasticsearchBulkOutputSchema,
  configSchema: ElasticsearchBulkConfigSchema,
};
