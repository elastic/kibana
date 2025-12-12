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
 * Source: elasticsearch-specification repository, operations: cat-plugins
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cat_plugins_request, cat_plugins_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_PLUGINS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.plugins',
  summary: `Get plugin information`,
  description: `Get plugin information.

Get a list of plugins running on each node of a cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-plugins`,
  methods: ['GET'],
  patterns: ['_cat/plugins'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-plugins',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['h', 's', 'include_bootstrap', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cat_plugins_request, 'body'),
    ...getShapeAt(cat_plugins_request, 'path'),
    ...getShapeAt(cat_plugins_request, 'query'),
  }),
  outputSchema: cat_plugins_response,
};
