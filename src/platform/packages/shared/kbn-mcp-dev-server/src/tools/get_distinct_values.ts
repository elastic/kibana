/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { ToolDefinition } from '../types';
import { client } from './code_search';

const getDistinctValuesInputSchema = z.object({
  field: z
    .enum(['type', 'language', 'kind'])
    .describe(
      "The field for which to retrieve distinct values. Can be 'type', 'language', or 'kind'."
    ),
});

async function getDistinctValuesHandler(input: z.infer<typeof getDistinctValuesInputSchema>) {
  const { field } = input;

  const response = await client.search({
    index: process.env.ELASTICSEARCH_INDEX || 'kibana-code-search',
    size: 0,
    aggs: {
      distinct_values: {
        terms: {
          field,
          size: 100, // Assuming we won't have more than 100 distinct values for these fields
        },
      },
    },
  });

  const buckets = response.aggregations?.distinct_values.buckets || [];
  const values = buckets.map((bucket: any) => bucket.key);

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
    "Retrieves all unique values for a specified field ('type', 'language', or 'kind') from the code search index.",
  inputSchema: getDistinctValuesInputSchema,
  handler: getDistinctValuesHandler,
};
