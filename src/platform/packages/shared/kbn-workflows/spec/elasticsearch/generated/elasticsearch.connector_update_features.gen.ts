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
 * Source: elasticsearch-specification repository, operations: connector-update-features
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_update_features_request,
  connector_update_features_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_UPDATE_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_features',
  summary: `Update the connector features`,
  description: `Update the connector features.

Update the connector features in the connector document.
This API can be used to control the following aspects of a connector:

* document-level security
* incremental syncs
* advanced sync rules
* basic sync rules

Normally, the running connector service automatically manages these features.
However, you can use this API to override the default behavior.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-features`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_features'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-features',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: ['features'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_update_features_request, 'body'),
    ...getShapeAt(connector_update_features_request, 'path'),
    ...getShapeAt(connector_update_features_request, 'query'),
  }),
  outputSchema: connector_update_features_response,
};
