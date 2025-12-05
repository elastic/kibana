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
 * Source: elasticsearch-specification repository, operations: cluster-delete-component-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_delete_component_template_request,
  cluster_delete_component_template_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_DELETE_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.delete_component_template',
  summary: `Delete component templates`,
  description: `Delete component templates.

Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template`,
  methods: ['DELETE'],
  patterns: ['_component_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_delete_component_template_request, 'body'),
    ...getShapeAt(cluster_delete_component_template_request, 'path'),
    ...getShapeAt(cluster_delete_component_template_request, 'query'),
  }),
  outputSchema: cluster_delete_component_template_response,
};
