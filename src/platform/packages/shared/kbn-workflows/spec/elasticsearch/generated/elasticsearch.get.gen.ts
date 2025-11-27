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
 * Generated at: 2025-11-27T07:43:24.871Z
 * Source: elasticsearch-specification repository, operations: get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_request, get_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get',
  connectorGroup: 'internal',
  summary: `Get a document by its ID`,
  description: `Get a document by its ID.

Get a document and its source or stored fields from an index.

By default, this API is realtime and is not affected by the refresh rate of the index (when data will become visible for search).
In the case where stored fields are requested with the \`stored_fields\` parameter and the document has been updated but is not yet refreshed, the API will have to parse and analyze the source to extract the stored fields.
To turn off realtime behavior, set the \`realtime\` parameter to false.

**Source filtering**

By default, the API returns the contents of the \`_source\` field unless you have used the \`stored_fields\` parameter or the \`_source\` field is turned off.
You can turn off \`_source\` retrieval by using the \`_source\` parameter:

\`\`\`
GET my-index-000001/_doc/0?_source=false
\`\`\`

If you only need one or two fields from the \`_source\`, use the \`_source_includes\` or \`_source_excludes\` parameters to include or filter out particular fields.
This can be helpful with large documents where partial retrieval can save on network overhead
Both parameters take a comma separated list of fields or wildcard expressions.
For example:

\`\`\`
GET my-index-000001/_doc/0?_source_includes=*.id&_source_excludes=entities
\`\`\`

If you only want to specify includes, you can use a shorter notation:

\`\`\`
GET my-index-000001/_doc/0?_source=*.id
\`\`\`

**Routing**

If routing is used during indexing, the routing value also needs to be specified to retrieve a document.
For example:

\`\`\`
GET my-index-000001/_doc/2?routing=user1
\`\`\`

This request gets the document with ID 2, but it is routed based on the user.
The document is not fetched if the correct routing is not specified.

**Distributed**

The GET operation is hashed into a specific shard ID.
It is then redirected to one of the replicas within that shard ID and returns the result.
The replicas are the primary shard and its replicas within that shard ID group.
This means that the more replicas you have, the better your GET scaling will be.

**Versioning support**

You can use the \`version\` parameter to retrieve the document only if its current version is equal to the specified one.

Internally, Elasticsearch has marked the old document as deleted and added an entirely new document.
The old version of the document doesn't disappear immediately, although you won't be able to access it.
Elasticsearch cleans up deleted documents in the background as you continue to index more data.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get`,
  methods: ['GET'],
  patterns: ['{index}/_doc/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_exclude_vectors',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_request, 'body'),
    ...getShapeAt(get_request, 'path'),
    ...getShapeAt(get_request, 'query'),
  }),
  outputSchema: get_response,
};
