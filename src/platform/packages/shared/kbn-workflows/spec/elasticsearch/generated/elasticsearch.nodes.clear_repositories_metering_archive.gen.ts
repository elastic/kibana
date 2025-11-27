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
 * Generated at: 2025-11-27T07:04:28.241Z
 * Source: elasticsearch-specification repository, operations: nodes-clear-repositories-metering-archive
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_clear_repositories_metering_archive_request,
  nodes_clear_repositories_metering_archive_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_CLEAR_REPOSITORIES_METERING_ARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.clear_repositories_metering_archive',
  connectorGroup: 'internal',
  summary: `Clear the archived repositories metering`,
  description: `Clear the archived repositories metering.

Clear the archived repositories metering information in the cluster.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-clear-repositories-metering-archive`,
  methods: ['DELETE'],
  patterns: ['_nodes/{node_id}/_repositories_metering/{max_archive_version}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-clear-repositories-metering-archive',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id', 'max_archive_version'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(nodes_clear_repositories_metering_archive_request, 'body'),
    ...getShapeAt(nodes_clear_repositories_metering_archive_request, 'path'),
    ...getShapeAt(nodes_clear_repositories_metering_archive_request, 'query'),
  }),
  outputSchema: nodes_clear_repositories_metering_archive_response,
};
