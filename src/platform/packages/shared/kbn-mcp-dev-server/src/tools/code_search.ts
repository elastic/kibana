/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { ClientOptions, estypes } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { ToolDefinition } from '../types';

const {
  ELASTICSEARCH_USERNAME = 'elastic',
  ELASTICSEARCH_PASSWORD = 'changeme',
  ELASTICSEARCH_ENDPOINT = 'http://localhost:9200',
  ELASTICSEARCH_INDEX = 'kibana-code-search',
  ELASTICSEARCH_INFERENCE_ID = '.elser_model_2',
  ELASTICSEARCH_API_KEY,
  ELASTICSEARCH_CLOUD_ID,
} = process.env;

interface CodeChunk {
  filePath: string;
  content: string;
  kind: string;
  language: string;
  startLine: number;
  endLine: number;
  git_branch: string;
  git_file_hash: string;
  chunk_hash: string;
  created_at: string;
  updated_at: string;
  type: string;
}

const codeSearchInputSchema = z.object({
  query: z.string().describe('The semantic query string to search for.'),
  kql: z.string().optional().describe('The KQL filter to apply to the search.'),
});

const clientOptions: ClientOptions = {};

if (ELASTICSEARCH_CLOUD_ID) {
  clientOptions.cloud = { id: ELASTICSEARCH_CLOUD_ID };
} else if (ELASTICSEARCH_ENDPOINT) {
  clientOptions.node = ELASTICSEARCH_ENDPOINT;
}

if (ELASTICSEARCH_API_KEY) {
  clientOptions.auth = { apiKey: ELASTICSEARCH_API_KEY };
} else if (ELASTICSEARCH_PASSWORD && ELASTICSEARCH_PASSWORD) {
  clientOptions.auth = {
    username: ELASTICSEARCH_USERNAME,
    password: ELASTICSEARCH_PASSWORD,
  };
}

export const client = new Client(clientOptions);

async function codeSearchHandler(input: z.infer<typeof codeSearchInputSchema>) {
  const sparseVectorQuery: estypes.QueryDslQueryContainer = {
    sparse_vector: {
      field: 'content_embedding',
      inference_id: ELASTICSEARCH_INFERENCE_ID,
      query: input.query,
    },
  };

  let query: estypes.QueryDslQueryContainer;

  if (input.kql) {
    const ast = fromKueryExpression(input.kql);
    const dsl = toElasticsearchQuery(ast);
    query = {
      bool: {
        must: [sparseVectorQuery, dsl],
      },
    };
  } else {
    query = sparseVectorQuery;
  }

  const response = await client.search<CodeChunk>({
    index: ELASTICSEARCH_INDEX,
    size: 10,
    _source: [
      'filePath',
      'content',
      'kind',
      'language',
      'startLine',
      'endLine',
      'git_branch',
      'git_file_hash',
      'chunk_hash',
      'created_at',
      'updated_at',
      'type',
    ],
    query,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          response.hits.hits.reduce((acc, hit) => {
            if (hit._source) {
              acc.push({ ...hit._source, score: hit._score });
            }
            return acc;
          }, [] as (CodeChunk & { score: number | null | undefined })[])
        ),
      } as const,
    ],
  };
}

export const codeSearchTool: ToolDefinition<typeof codeSearchInputSchema> = {
  name: 'code_search',
  description:
    'Performs a semantic search of the Kibana codebase using a unified Elasticsearch index. This tool is ideal for a "chain of investigation" approach to exploring the codebase.',
  inputSchema: codeSearchInputSchema,
  handler: codeSearchHandler,
};
