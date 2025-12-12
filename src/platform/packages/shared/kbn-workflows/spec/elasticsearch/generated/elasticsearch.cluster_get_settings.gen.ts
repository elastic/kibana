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
 * Source: elasticsearch-specification repository, operations: cluster-get-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_get_settings_request,
  cluster_get_settings_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.get_settings',
  summary: `Get cluster-wide settings`,
  description: `Get cluster-wide settings.

By default, it returns only settings that have been explicitly defined.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-get-settings`,
  methods: ['GET'],
  patterns: ['_cluster/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-get-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['flat_settings', 'include_defaults', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_get_settings_request, 'body'),
    ...getShapeAt(cluster_get_settings_request, 'path'),
    ...getShapeAt(cluster_get_settings_request, 'query'),
  }),
  outputSchema: cluster_get_settings_response,
};
