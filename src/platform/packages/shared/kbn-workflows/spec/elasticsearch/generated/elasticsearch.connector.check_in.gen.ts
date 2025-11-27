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
 * Generated at: 2025-11-27T07:43:24.862Z
 * Source: elasticsearch-specification repository, operations: connector-check-in
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { connector_check_in_request, connector_check_in_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_CHECK_IN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.check_in',
  connectorGroup: 'internal',
  summary: `Check in a connector`,
  description: `Check in a connector.

Update the \`last_seen\` field in the connector and set it to the current timestamp.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-check-in`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_check_in'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-check-in',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_check_in_request, 'body'),
    ...getShapeAt(connector_check_in_request, 'path'),
    ...getShapeAt(connector_check_in_request, 'query'),
  }),
  outputSchema: connector_check_in_response,
};
