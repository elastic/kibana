/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election.
 */
import { elasticsearchBulkStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

const DEFAULT_BATCH_SIZE = 500;

interface BulkResponseItem {
  index?: { error?: { type?: string; reason?: string } };
}

const toNdjson = (docs: Record<string, unknown>[]): string =>
  docs.map((doc) => `${JSON.stringify({ index: {} })}\n${JSON.stringify(doc)}`).join('\n') + '\n';

export const elasticsearchBulkStepDefinition = createServerStepDefinition({
  ...elasticsearchBulkStepCommonDefinition,
  handler: async (context) => {
    const { index, documents, batch_size: batchSize, require_refresh: requireRefresh } =
      context.input;
    const size = batchSize ?? DEFAULT_BATCH_SIZE;
    const client = context.contextManager.getScopedEsClient();
    let indexed = 0;
    let failed = 0;
    let batches = 0;
    const errors: string[] = [];

    for (let i = 0; i < documents.length; i += size) {
      const batch = documents.slice(i, i + size);
      const response = await client.bulk({
        index,
        refresh: requireRefresh ? 'wait_for' : false,
        body: toNdjson(batch),
      });
      batches += 1;
      if (response.errors) {
        const items = (response.items ?? []) as BulkResponseItem[];
        for (const item of items) {
          if (item.index?.error) {
            failed += 1;
            errors.push(`${item.index.error.type}: ${item.index.error.reason ?? 'unknown'}`);
          } else {
            indexed += 1;
          }
        }
      } else {
        indexed += batch.length;
      }
    }

    if (indexed === 0 && failed > 0) {
      return {
        error: new Error(
          `elasticsearch.bulk: all ${failed} items failed. First error: ${errors[0] ?? 'unknown'}`
        ),
      };
    }
    if (failed > 0) {
      context.logger.warn(
        `elasticsearch.bulk: ${failed}/${indexed + failed} items failed. First error: ${
          errors[0] ?? 'unknown'
        }`
      );
    }
    return { output: { indexed, failed, batches } };
  },
});
