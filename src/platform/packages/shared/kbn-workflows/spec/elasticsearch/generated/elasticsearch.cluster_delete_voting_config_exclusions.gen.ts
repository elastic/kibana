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
 * Source: elasticsearch-specification repository, operations: cluster-delete-voting-config-exclusions
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cluster_delete_voting_config_exclusions_request } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_DELETE_VOTING_CONFIG_EXCLUSIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.delete_voting_config_exclusions',
  summary: `Clear cluster voting config exclusions`,
  description: `Clear cluster voting config exclusions.

Remove master-eligible nodes from the voting configuration exclusion list.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions`,
  methods: ['DELETE'],
  patterns: ['_cluster/voting_config_exclusions'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'wait_for_removal'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_delete_voting_config_exclusions_request, 'body'),
    ...getShapeAt(cluster_delete_voting_config_exclusions_request, 'path'),
    ...getShapeAt(cluster_delete_voting_config_exclusions_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
