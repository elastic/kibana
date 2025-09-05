/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License"
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { ToolDefinition } from '../types';
import { client } from '../utils/elasticsearch';

const {
  ELASTICSEARCH_INDEX = 'kibana-code-search',
  ELASTICSEARCH_INFERENCE_ID = '.elser_model_2',
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
  query: z.string().optional().describe('The semantic query string to search for.'),
  kql: z.string().optional().describe('The KQL filter to apply to the search.'),
  size: z.number().optional().default(20).describe('The number of results to return.'),
  page: z.number().optional().default(1).describe('The page of results to return.'),
});

async function codeSearchHandler(input: z.infer<typeof codeSearchInputSchema>) {
  const { query: queryString, kql, size, page } = input;
  const mustClauses: estypes.QueryDslQueryContainer[] = [];

  if (queryString) {
    mustClauses.push({
      sparse_vector: {
        field: 'content_embedding',
        inference_id: ELASTICSEARCH_INFERENCE_ID,
        query: queryString,
      },
    });
  }

  if (kql) {
    const ast = fromKueryExpression(kql);
    const dsl = toElasticsearchQuery(ast);
    mustClauses.push(dsl);
  }

  if (mustClauses.length === 0) {
    // If no query or kql is provided, match all documents.
    // This is useful for listing all documents with pagination.
    mustClauses.push({ match_all: {} });
  }

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      must: mustClauses,
    },
  };

  const from = (page - 1) * size;

  const response = await client.search<CodeChunk>({
    index: ELASTICSEARCH_INDEX,
    size,
    from,
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
      'imports',
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

const description = `
Performs a semantic search of the Kibana codebase using a unified Elasticsearch index. This tool is ideal for a "chain of investigation" approach to exploring the codebase.

Either a \`query\` for semantic search or a \`kql\` filter is required. If both are provided, they are combined with a must clause (AND operator) in Elasticsearch. You can control the number of results with \`size\` and paginate through them using \`page\`.

You can use the following fields in your KQL queries:

- **type** (keyword): The type of the code chunk (e.g., 'code', 'doc').
- **language** (keyword): The programming language of the code (e.g., 'markdown', 'typescript', 'javascript').
- **kind** (keyword):  The specific kind of the code symbol (from LSP) (e.g., 'call_expression', 'import_statement', 'comment', 'function_declaration', 'type_alias_declaration', 'interface_declaration', 'lexical_declaration').
- **imports** (keyword): A list of imported modules or libraries.
- **containerPath** (text):  The path of the containing symbol (e.g., class name for a method).
- **filePath** (keyword): The absolute path to the source file.
- **startLine** (integer): The starting line number of the chunk in the file.
- **endLine** (integer): The ending line number of the chunk in the file.
- **created_at** (date): The timestamp when the document was created.
- **updated_at** (date): The timestamp when the document was last updated.

### Example: Semantic Search with a KQL Filter

To find all functions related to "rendering a table", you could use:


  {
    "query": "render a table",
    "kql": "type: \"function\""
  }


### Example: KQL-Only Search

To find all TypeScript classes, omitting the semantic query, you could use:


  {
    "kql": "language: \"typescript\" and type: \"class\"",
    "size": 5
  }


### Example: Paginated Search

To get the second page of 50 results for files importing the React library, you could use:


  {
    "query": "state management",
    "kql": "imports: *from 'react'",
    "size": 50,
    "page": 2
  }
`;

export const codeSearchTool: ToolDefinition<typeof codeSearchInputSchema> = {
  name: 'code_search',
  description,
  inputSchema: codeSearchInputSchema,
  handler: codeSearchHandler,
};
