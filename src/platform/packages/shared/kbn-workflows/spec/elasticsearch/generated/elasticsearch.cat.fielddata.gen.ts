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
 * Generated at: 2025-11-27T07:04:28.183Z
 * Source: elasticsearch-specification repository, operations: cat-fielddata, cat-fielddata-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_fielddata1_request,
  cat_fielddata1_response,
  cat_fielddata_request,
  cat_fielddata_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_FIELDDATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.fielddata',
  connectorGroup: 'internal',
  summary: `Get field data cache information`,
  description: `Get field data cache information.

Get the amount of heap memory currently used by the field data cache on every data node in the cluster.

IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the nodes stats API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-fielddata`,
  methods: ['GET'],
  patterns: ['_cat/fielddata', '_cat/fielddata/{fields}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-fielddata',
  parameterTypes: {
    headerParams: [],
    pathParams: ['fields'],
    urlParams: ['fields', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_fielddata_request, 'body'),
      ...getShapeAt(cat_fielddata_request, 'path'),
      ...getShapeAt(cat_fielddata_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_fielddata1_request, 'body'),
      ...getShapeAt(cat_fielddata1_request, 'path'),
      ...getShapeAt(cat_fielddata1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_fielddata_response, cat_fielddata1_response]),
};
