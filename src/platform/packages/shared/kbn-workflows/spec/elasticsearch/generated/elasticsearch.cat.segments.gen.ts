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
 * Generated at: 2025-11-27T07:43:24.857Z
 * Source: elasticsearch-specification repository, operations: cat-segments, cat-segments-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_segments1_request,
  cat_segments1_response,
  cat_segments_request,
  cat_segments_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_SEGMENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.segments',
  connectorGroup: 'internal',
  summary: `Get segment information`,
  description: `Get segment information.

Get low-level information about the Lucene segments in index shards.
For data streams, the API returns information about the backing indices.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index segments API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-segments`,
  methods: ['GET'],
  patterns: ['_cat/segments', '_cat/segments/{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-segments',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'h',
      's',
      'local',
      'master_timeout',
      'expand_wildcards',
      'allow_no_indices',
      'ignore_throttled',
      'ignore_unavailable',
      'allow_closed',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_segments_request, 'body'),
      ...getShapeAt(cat_segments_request, 'path'),
      ...getShapeAt(cat_segments_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_segments1_request, 'body'),
      ...getShapeAt(cat_segments1_request, 'path'),
      ...getShapeAt(cat_segments1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_segments_response, cat_segments1_response]),
};
