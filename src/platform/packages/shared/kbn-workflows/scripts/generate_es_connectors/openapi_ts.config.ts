/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable import/no-default-export */

import type { UserConfig } from '@hey-api/openapi-ts';
import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';
import {
  ES_SPEC_OPENAPI_PATH,
  ES_SPEC_SCHEMA_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import { alignDefaultWithEnum } from '../shared/oas_align_default_with_enum';
import { allowShortQuerySyntax } from '../shared/oas_allow_short_query_syntax';
import { removeDiscriminatorsWithoutMapping } from '../shared/oas_remove_discriminators_without_mapping';
import { createRemoveServerDefaults } from '../shared/oas_remove_server_defaults';

console.log('Reading OpenAPI spec from ', ES_SPEC_OPENAPI_PATH);
const openApiSpec = JSON.parse(fs.readFileSync(ES_SPEC_OPENAPI_PATH, 'utf8')) as OpenAPIV3.Document;
console.log('Preprocessing OpenAPI spec...');
const preprocessedOpenApiSpec = [
  removeDiscriminatorsWithoutMapping,
  allowShortQuerySyntax,
  alignDefaultWithEnum,
  // Remove server-side defaults from OpenAPI spec to prevent Zod from applying them client-side
  // This uses schema.json from elasticsearch-specification to identify fields with @server_default
  createRemoveServerDefaults(ES_SPEC_SCHEMA_PATH),
].reduce((acc, fn) => fn(acc), openApiSpec);

const config: UserConfig = {
  // @ts-expect-error - for some reason openapi-ts doesn't accept OpenAPIV3.Document
  input: preprocessedOpenApiSpec,
  output: {
    path: OPENAPI_TS_OUTPUT_FOLDER_PATH,
    fileName: OPENAPI_TS_OUTPUT_FILENAME,
  },
  parser: {
    filters: {
      operations: {
        include: [
          'index', // Index document with ID (PUT /{index}/_doc/{id})
          'index-1', // Index document without ID (POST /{index}/_doc)
          'create-1', // Create document (POST /{index}/_create/{id})
          'create', // Create document (PUT /{index}/_create/{id})
          'delete', // Delete document by ID (DELETE /{index}/_doc/{id})
          'exists', // Check if document exists (HEAD /{index}/_doc/{id})
          'get', // Get document by ID (GET /{index}/_doc/{id})
          'update', // Update document by ID (POST /{index}/_update/{id})
          'search', // Search all indices with body (POST /_search)
          'search-2', // Search specific index with body (POST /{index}/_search)
          'count', // Count documents in all indices with query (POST /_count)
          'count-3', // Count documents in specific index with query (POST /{index}/_count)
          // The full list of included operations (for reference):

          // Document Operations (CRUD)
          // 'PUT /{index}/_doc/{id}', // Index document with ID.                    | index
          // 'POST /{index}/_doc', // Index document without ID                      | index-1
          // 'POST /{index}/_create/{id}', // Create document (POST)                 | create-1
          // 'PUT /{index}/_create/{id}', // Create document (PUT)                   | create
          // 'DELETE /{index}/_doc/{id}', // Delete document by ID                   | delete
          // 'HEAD /{index}/_doc/{id}', // Check if document exists                  | exists
          // 'GET /{index}/_doc/{id}', // Get document by ID                         | get
          // 'POST /{index}/_update/{id}', // Update document by ID                  | update
          // 'POST /_search', // Search all indices with body.                       | search
          // 'POST /{index}/_search', // Search specific index with body             | search-2
          // 'POST /_count', // Count documents in all indices with query            | count
          // 'POST /{index}/_count', // Count documents in specific index with query | count-3
          // 'GET /{index}/_source/{id}', // Get document source only
          // 'POST /{index}/_update_by_query', // Update documents by query
          // 'GET /_mget', // Multi-get documents (global)
          // 'POST /_mget', // Multi-get documents with body (global)
          // 'GET /{index}/_mget', // Multi-get documents (index-specific)
          // 'POST /{index}/_mget', // Multi-get documents with body (index-specific)
          // Search and Query Operations
          // 'GET /_search', // Search all indices
          // 'GET /{index}/_search', // Search specific index
          // 'GET /_msearch', // Multi-search all indices
          // 'POST /_msearch', // Multi-search all indices with body
          // 'GET /{index}/_msearch', // Multi-search specific index
          // 'POST /{index}/_msearch', // Multi-search specific index with body
          // 'GET /_search/template', // Search with template (global)
          // 'POST /_search/template', // Search with template and body (global)
          // 'GET /{index}/_search/template', // Search with template (index-specific)
          // 'POST /{index}/_search/template', // Search with template and body (index-specific)
          // 'GET /_msearch/template', // Multi-search with template (global)
          // 'POST /_msearch/template', // Multi-search with template and body (global)
          // 'GET /{index}/_msearch/template', // Multi-search with template (index-specific)
          // 'POST /{index}/_msearch/template', // Multi-search with template and body (index-specific)
          // 'GET /_count', // Count documents in all indices
          // 'GET /{index}/_count', // Count documents in specific index
          // 'GET /{index}/_explain/{id}', // Explain query scoring for document
          // 'POST /{index}/_explain/{id}', // Explain query scoring with body
          // 'GET /_field_caps', // Get field capabilities (all indices)
          // 'POST /_field_caps', // Get field capabilities with body (all indices)
          // 'GET /{index}/_field_caps', // Get field capabilities (specific index)
          // 'POST /{index}/_field_caps', // Get field capabilities with body (specific index)
          // 'GET /_knn_search', // k-NN search (all indices)
          // 'POST /_knn_search', // k-NN search with body (all indices)
          // 'GET /{index}/_knn_search', // k-NN search (specific index)
          // 'POST /{index}/_knn_search', // k-NN search with body (specific index)
          // 'GET /{index}/_terms_enum', // Enumerate terms in index
          // 'POST /{index}/_terms_enum', // Enumerate terms with body
          // 'GET /{index}/_termvectors', // Get term vectors for index
          // 'POST /{index}/_termvectors', // Get term vectors with body
          // 'GET /{index}/_termvectors/{id}', // Get term vectors for document
          // 'POST /{index}/_termvectors/{id}', // Get term vectors for document with body
        ],
      },
    },
  },
  plugins: [
    {
      name: 'zod',
      case: 'snake_case',
      requests: {
        name: '{{name}}_request',
      },
      responses: {
        name: '{{name}}_response',
      },
      definitions: {
        name: '{{name}}',
      },
      metadata: true,
      compatibilityVersion: 4,
    },
  ],
};

export default config;
