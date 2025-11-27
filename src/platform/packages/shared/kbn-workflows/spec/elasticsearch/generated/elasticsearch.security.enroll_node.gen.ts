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
 * Generated at: 2025-11-27T07:43:24.912Z
 * Source: elasticsearch-specification repository, operations: security-enroll-node
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { security_enroll_node_request, security_enroll_node_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_ENROLL_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.enroll_node',
  connectorGroup: 'internal',
  summary: `Enroll a node`,
  description: `Enroll a node.

Enroll a new node to allow it to join an existing cluster with security features enabled.

The response contains all the necessary information for the joining node to bootstrap discovery and security related settings so that it can successfully join the cluster.
The response contains key and certificate material that allows the caller to generate valid signed certificates for the HTTP layer of all nodes in the cluster.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-node`,
  methods: ['GET'],
  patterns: ['_security/enroll/node'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-node',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_enroll_node_request, 'body'),
    ...getShapeAt(security_enroll_node_request, 'path'),
    ...getShapeAt(security_enroll_node_request, 'query'),
  }),
  outputSchema: security_enroll_node_response,
};
