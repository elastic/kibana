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
 * Generated at: 2025-11-27T07:43:24.883Z
 * Source: elasticsearch-specification repository, operations: indices-segments, indices-segments-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_segments1_request,
  indices_segments1_response,
  indices_segments_request,
  indices_segments_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_SEGMENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.segments',
  connectorGroup: 'internal',
  summary: `Get index segments`,
  description: `Get index segments.

Get low-level information about the Lucene segments in index shards.
For data streams, the API returns information about the stream's backing indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-segments`,
  methods: ['GET'],
  patterns: ['_segments', '{index}/_segments'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-segments',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_segments_request, 'body'),
      ...getShapeAt(indices_segments_request, 'path'),
      ...getShapeAt(indices_segments_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_segments1_request, 'body'),
      ...getShapeAt(indices_segments1_request, 'path'),
      ...getShapeAt(indices_segments1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_segments_response, indices_segments1_response]),
};
