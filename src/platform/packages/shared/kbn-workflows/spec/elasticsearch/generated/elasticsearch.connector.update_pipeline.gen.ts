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
 * Generated at: 2025-11-27T07:04:28.205Z
 * Source: elasticsearch-specification repository, operations: connector-update-pipeline
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_update_pipeline_request,
  connector_update_pipeline_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_UPDATE_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_pipeline',
  connectorGroup: 'internal',
  summary: `Update the connector pipeline`,
  description: `Update the connector pipeline.

When you create a new connector, the configuration of an ingest pipeline is populated with default settings.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-pipeline`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_pipeline'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-pipeline',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: ['pipeline'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_update_pipeline_request, 'body'),
    ...getShapeAt(connector_update_pipeline_request, 'path'),
    ...getShapeAt(connector_update_pipeline_request, 'query'),
  }),
  outputSchema: connector_update_pipeline_response,
};
