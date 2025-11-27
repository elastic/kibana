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
 * Generated at: 2025-11-27T07:04:28.194Z
 * Source: elasticsearch-specification repository, operations: cluster-get-component-template, cluster-get-component-template-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_get_component_template1_request,
  cluster_get_component_template1_response,
  cluster_get_component_template_request,
  cluster_get_component_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_GET_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.get_component_template',
  connectorGroup: 'internal',
  summary: `Get component templates`,
  description: `Get component templates.

Get information about component templates.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template`,
  methods: ['GET'],
  patterns: ['_component_template', '_component_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['flat_settings', 'settings_filter', 'include_defaults', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cluster_get_component_template_request, 'body'),
      ...getShapeAt(cluster_get_component_template_request, 'path'),
      ...getShapeAt(cluster_get_component_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_get_component_template1_request, 'body'),
      ...getShapeAt(cluster_get_component_template1_request, 'path'),
      ...getShapeAt(cluster_get_component_template1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    cluster_get_component_template_response,
    cluster_get_component_template1_response,
  ]),
};
