/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Generated at: 2025-11-27T07:43:24.904Z
 * Source: elasticsearch-specification repository, operations: msearch-template, msearch-template-1, msearch-template-2, msearch-template-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  msearch_template1_request,
  msearch_template1_response,
  msearch_template2_request,
  msearch_template2_response,
  msearch_template3_request,
  msearch_template3_response,
  msearch_template_request,
  msearch_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MSEARCH_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.msearch_template',
  connectorGroup: 'internal',
  summary: `Run multiple templated searches`,
  description: `Run multiple templated searches.

Run multiple templated searches with a single request.
If you are providing a text file or text input to \`curl\`, use the \`--data-binary\` flag instead of \`-d\` to preserve newlines.
For example:

\`\`\`
\$ cat requests
{ "index": "my-index" }
{ "id": "my-search-template", "params": { "query_string": "hello world", "from": 0, "size": 10 }}
{ "index": "my-other-index" }
{ "id": "my-other-search-template", "params": { "query_type": "match_all" }}

\$ curl -H "Content-Type: application/x-ndjson" -XGET localhost:9200/_msearch/template --data-binary "@requests"; echo
\`\`\`

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch-template`,
  methods: ['GET', 'POST'],
  patterns: ['_msearch/template', '{index}/_msearch/template'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'ccs_minimize_roundtrips',
      'max_concurrent_searches',
      'search_type',
      'rest_total_hits_as_int',
      'typed_keys',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(msearch_template_request, 'body'),
      ...getShapeAt(msearch_template_request, 'path'),
      ...getShapeAt(msearch_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(msearch_template1_request, 'body'),
      ...getShapeAt(msearch_template1_request, 'path'),
      ...getShapeAt(msearch_template1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(msearch_template2_request, 'body'),
      ...getShapeAt(msearch_template2_request, 'path'),
      ...getShapeAt(msearch_template2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(msearch_template3_request, 'body'),
      ...getShapeAt(msearch_template3_request, 'path'),
      ...getShapeAt(msearch_template3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    msearch_template_response,
    msearch_template1_response,
    msearch_template2_response,
    msearch_template3_response,
  ]),
};
