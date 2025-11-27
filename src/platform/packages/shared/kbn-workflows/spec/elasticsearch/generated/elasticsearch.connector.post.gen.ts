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
 * Generated at: 2025-11-27T07:04:28.199Z
 * Source: elasticsearch-specification repository, operations: connector-post
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { connector_post_request, connector_post_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.post',
  connectorGroup: 'internal',
  summary: `Create a connector`,
  description: `Create a connector.

Connectors are Elasticsearch integrations that bring content from third-party data sources, which can be deployed on Elastic Cloud or hosted on your own infrastructure.
Elastic managed connectors (Native connectors) are a managed service on Elastic Cloud.
Self-managed connectors (Connector clients) are self-managed on your infrastructure.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put`,
  methods: ['POST'],
  patterns: ['_connector'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['description', 'index_name', 'is_native', 'language', 'name', 'service_type'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_post_request, 'body'),
    ...getShapeAt(connector_post_request, 'path'),
    ...getShapeAt(connector_post_request, 'query'),
  }),
  outputSchema: connector_post_response,
};
