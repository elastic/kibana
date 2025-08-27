/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { ToolDefinition } from '../types';
import { client } from '../utils/elasticsearch';

const getDistinctValuesInputSchema = z.object({
  field: z
    .enum(['type', 'language', 'kind', 'filePath', 'imports'])
    .describe(
      "The field for which to retrieve distinct values. Can be 'type', 'language', 'kind', 'filePath', or 'imports'."
    ),
  kql: z.string().optional().describe('An optional KQL filter to apply before aggregating.'),
});

interface GetDistinctValuesAggResults {
  distinct_values: {
    buckets: Array<{ key: string }>;
  };
}

async function getDistinctValuesHandler(input: z.infer<typeof getDistinctValuesInputSchema>) {
  const { field, kql } = input;

  let query;
  if (kql) {
    const ast = fromKueryExpression(kql);
    query = toElasticsearchQuery(ast);
  }

  const response = await client.search<unknown, GetDistinctValuesAggResults>({
    index: process.env.ELASTICSEARCH_INDEX || 'kibana-code-search',
    size: 0,
    query,
    aggs: {
      distinct_values: {
        terms: {
          field,
          size: 1000, // Increased size to better handle filePath and imports
        },
      },
    },
  });

  const buckets = response.aggregations?.distinct_values?.buckets || [];
  const values = buckets.map((bucket) => bucket.key);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(values),
      } as const,
    ],
  };
}

export const getDistinctValuesTool: ToolDefinition<typeof getDistinctValuesInputSchema> = {
  name: 'get_distinct_values',
  description:
    'Retrieves all unique values for a specified field from the code search index. Can be filtered with an optional KQL query.',
  inputSchema: getDistinctValuesInputSchema,
  handler: getDistinctValuesHandler,
};
