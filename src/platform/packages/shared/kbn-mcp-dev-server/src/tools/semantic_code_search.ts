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
  ELASTICSEARCH_INDEX = 'kibana-code-search-2.0',
  ELASTICSEARCH_INFERENCE_ID = '.elser_model_2_linux-x86_64',
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

const semanticCodeSearchInputSchema = z.object({
  query: z.string().optional().describe('The semantic query string to search for.'),
  kql: z.string().optional().describe('The KQL filter to apply to the search.'),
  size: z.number().optional().default(50).describe('The number of results to return.'),
  page: z.number().optional().default(1).describe('The page of results to return.'),
});

async function semanticCodeSearchHandler(input: z.infer<typeof semanticCodeSearchInputSchema>) {
  const { query: queryString, kql, size, page } = input;
  const mustClauses: estypes.QueryDslQueryContainer[] = [];

  if (queryString) {
    mustClauses.push({
      semantic: {
        field: 'semantic_text',
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
The primary tool for starting a "chain of investigation." Use this for broad, semantic exploration when you don't know the exact file or symbol names.

**Best for:**
*   **Initial Discovery:** Answering questions like, "Where is the logic for SLO SLIs?" or "How are API keys handled?"
*   **Finding Entry Points:** Use broad, conceptual queries (e.g., "SLI registration", "user authentication flow") to find the most relevant files and symbols.
*   **Narrowing the Search:** Once you have initial results, you can refine your search with more specific terms (e.g., "IndicatorType enum") or KQL filters.

**Workflow:**
1.  Start with a broad, semantic query to understand the landscape.
2.  Analyze the results to identify key files, functions, classes, or types.
3.  Once you have identified a specific, concrete symbol, **switch to \`symbol_analysis\`** for a precise analysis of its connections.

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

### IMPORTANT QUERY TIPS
- CRITICAL: ALWAYS use semantic search terms. If the user asks "Show me how to add an SLI to the SLO Plugin", use "add SLI to SLO plugin" for the query.
- CRITICAL: ALWAYS base your queries on the user's prompt, you will have a higher success rate by doing this.
- CRITICAL: ALWAYS follow the "chain of investigation" method
- CRITICAL: NEVER try to answer questions without using semantic search first.
- CRITICAL: NEVER double quite a \`kql\` wildcard query. Double quotes are used for EXACT MATCHES
- CRITICAL: ALWAYS show "I'm going to use \`semantic_code_search\` with the \`query: "<insert-semantic-search-here>"\` and \`kql: "<kql-query-here>"\` so the user can see what terms you're using to search
- If you are unsure what explicit values to use for \`kind\` use the \`get_distinct_values\` to get a complete list of the keywords
- If you are trying to match the exact name of a symbol, use the \`content\` field in a kql query like this: \`content: "<symbol-name-here>"\`

### Example: Semantic Search with a KQL Filter

To find all functions related to "rendering a table", you could use:


  {
    "query": "render a table",
    "kql": "kind: \"function_declaration\""
  }


### Example: KQL-Only Search

To find all TypeScript classes, omitting the semantic query, you could use:


  {
    "kql": "language: \"typescript\" and kind: \"class_declaration\"",
    "size": 5
  }


### Example: Paginated Search

To get the second page of 50 results for files importing the React library, you could use:


  {
    "query": "state management",
    "kql": "imports: *from 'react'*",
    "size": 50,
    "page": 2
  }
`;

export const semanticCodeSearchTool: ToolDefinition<typeof semanticCodeSearchInputSchema> = {
  name: 'semantic_code_search',
  description,
  inputSchema: semanticCodeSearchInputSchema,
  handler: semanticCodeSearchHandler,
};
