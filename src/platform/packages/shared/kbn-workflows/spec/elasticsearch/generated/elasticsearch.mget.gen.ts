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
 * Source: elasticsearch-specification repository, operations: mget, mget-1, mget-2, mget-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  mget1_request,
  mget1_response,
  mget2_request,
  mget2_response,
  mget3_request,
  mget3_response,
  mget_request,
  mget_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MGET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.mget',
  summary: `Get multiple documents`,
  description: `Get multiple documents.

Get multiple JSON documents by ID from one or more indices.
If you specify an index in the request URI, you only need to specify the document IDs in the request body.
To ensure fast responses, this multi get (mget) API responds with partial results if one or more shards fail.

**Filter source fields**

By default, the \`_source\` field is returned for every document (if stored).
Use the \`_source\` and \`_source_include\` or \`source_exclude\` attributes to filter what fields are returned for a particular document.
You can include the \`_source\`, \`_source_includes\`, and \`_source_excludes\` query parameters in the request URI to specify the defaults to use when there are no per-document instructions.

**Get stored fields**

Use the \`stored_fields\` attribute to specify the set of stored fields you want to retrieve.
Any requested fields that are not stored are ignored.
You can include the \`stored_fields\` query parameter in the request URI to specify the defaults to use when there are no per-document instructions.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mget`,
  methods: ['GET', 'POST'],
  patterns: ['_mget', '{index}/_mget'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mget',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
    ],
    bodyParams: ['docs', 'ids'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(mget_request, 'body'),
      ...getShapeAt(mget_request, 'path'),
      ...getShapeAt(mget_request, 'query'),
    }),
    z.object({
      ...getShapeAt(mget1_request, 'body'),
      ...getShapeAt(mget1_request, 'path'),
      ...getShapeAt(mget1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(mget2_request, 'body'),
      ...getShapeAt(mget2_request, 'path'),
      ...getShapeAt(mget2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(mget3_request, 'body'),
      ...getShapeAt(mget3_request, 'path'),
      ...getShapeAt(mget3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([mget_response, mget1_response, mget2_response, mget3_response]),
};
