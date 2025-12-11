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
 * Source: elasticsearch-specification repository, operations: cluster-exists-component-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cluster_exists_component_template_request } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_EXISTS_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.exists_component_template',
  summary: `Check component templates`,
  description: `Check component templates.

Returns information about whether a particular component template exists.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template`,
  methods: ['HEAD'],
  patterns: ['_component_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'local'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_exists_component_template_request, 'body'),
    ...getShapeAt(cluster_exists_component_template_request, 'path'),
    ...getShapeAt(cluster_exists_component_template_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
