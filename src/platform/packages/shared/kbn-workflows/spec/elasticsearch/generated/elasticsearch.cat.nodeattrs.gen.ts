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
 * Generated at: 2025-11-27T07:43:24.856Z
 * Source: elasticsearch-specification repository, operations: cat-nodeattrs
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cat_nodeattrs_request, cat_nodeattrs_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_NODEATTRS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.nodeattrs',
  connectorGroup: 'internal',
  summary: `Get node attribute information`,
  description: `Get node attribute information.

Get information about custom node attributes.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodeattrs`,
  methods: ['GET'],
  patterns: ['_cat/nodeattrs'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodeattrs',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cat_nodeattrs_request, 'body'),
    ...getShapeAt(cat_nodeattrs_request, 'path'),
    ...getShapeAt(cat_nodeattrs_request, 'query'),
  }),
  outputSchema: cat_nodeattrs_response,
};
