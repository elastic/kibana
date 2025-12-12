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
 * Source: elasticsearch-specification repository, operations: termvectors, termvectors-1, termvectors-2, termvectors-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  termvectors1_request,
  termvectors1_response,
  termvectors2_request,
  termvectors2_response,
  termvectors3_request,
  termvectors3_response,
  termvectors_request,
  termvectors_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TERMVECTORS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.termvectors',
  summary: `Get term vector information`,
  description: `Get term vector information.

Get information and statistics about terms in the fields of a particular document.

You can retrieve term vectors for documents stored in the index or for artificial documents passed in the body of the request.
You can specify the fields you are interested in through the \`fields\` parameter or by adding the fields to the request body.
For example:

\`\`\`
GET /my-index-000001/_termvectors/1?fields=message
\`\`\`

Fields can be specified using wildcards, similar to the multi match query.

Term vectors are real-time by default, not near real-time.
This can be changed by setting \`realtime\` parameter to \`false\`.

You can request three types of values: _term information_, _term statistics_, and _field statistics_.
By default, all term information and field statistics are returned for all fields but term statistics are excluded.

**Term information**

* term frequency in the field (always returned)
* term positions (\`positions: true\`)
* start and end offsets (\`offsets: true\`)
* term payloads (\`payloads: true\`), as base64 encoded bytes

If the requested information wasn't stored in the index, it will be computed on the fly if possible.
Additionally, term vectors could be computed for documents not even existing in the index, but instead provided by the user.

> warn
> Start and end offsets assume UTF-16 encoding is being used. If you want to use these offsets in order to get the original text that produced this token, you should make sure that the string you are taking a sub-string of is also encoded using UTF-16.

**Behaviour**

The term and field statistics are not accurate.
Deleted documents are not taken into account.
The information is only retrieved for the shard the requested document resides in.
The term and field statistics are therefore only useful as relative measures whereas the absolute numbers have no meaning in this context.
By default, when requesting term vectors of artificial documents, a shard to get the statistics from is randomly selected.
Use \`routing\` only to hit a particular shard.
Refer to the linked documentation for detailed examples of how to use this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-termvectors`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_termvectors/{id}', '{index}/_termvectors'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-termvectors',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'fields',
      'field_statistics',
      'offsets',
      'payloads',
      'positions',
      'preference',
      'realtime',
      'routing',
      'term_statistics',
      'version',
      'version_type',
    ],
    bodyParams: [
      'doc',
      'filter',
      'per_field_analyzer',
      'fields',
      'field_statistics',
      'offsets',
      'payloads',
      'positions',
      'term_statistics',
      'routing',
      'version',
      'version_type',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(termvectors_request, 'body'),
      ...getShapeAt(termvectors_request, 'path'),
      ...getShapeAt(termvectors_request, 'query'),
    }),
    z.object({
      ...getShapeAt(termvectors1_request, 'body'),
      ...getShapeAt(termvectors1_request, 'path'),
      ...getShapeAt(termvectors1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(termvectors2_request, 'body'),
      ...getShapeAt(termvectors2_request, 'path'),
      ...getShapeAt(termvectors2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(termvectors3_request, 'body'),
      ...getShapeAt(termvectors3_request, 'path'),
      ...getShapeAt(termvectors3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    termvectors_response,
    termvectors1_response,
    termvectors2_response,
    termvectors3_response,
  ]),
};
