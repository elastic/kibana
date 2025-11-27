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
 * Source: elasticsearch-specification repository, operations: cat-snapshots, cat-snapshots-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_snapshots1_request,
  cat_snapshots1_response,
  cat_snapshots_request,
  cat_snapshots_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_SNAPSHOTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.snapshots',
  connectorGroup: 'internal',
  summary: `Get snapshot information`,
  description: `Get snapshot information.

Get information about the snapshots stored in one or more repositories.
A snapshot is a backup of an index or running Elasticsearch cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-snapshots`,
  methods: ['GET'],
  patterns: ['_cat/snapshots', '_cat/snapshots/{repository}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-snapshots',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: ['ignore_unavailable', 'h', 's', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_snapshots_request, 'body'),
      ...getShapeAt(cat_snapshots_request, 'path'),
      ...getShapeAt(cat_snapshots_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_snapshots1_request, 'body'),
      ...getShapeAt(cat_snapshots1_request, 'path'),
      ...getShapeAt(cat_snapshots1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_snapshots_response, cat_snapshots1_response]),
};
