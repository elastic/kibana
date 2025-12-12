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
 * Source: elasticsearch-specification repository, operations: connector-update-api-key-id
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_update_api_key_id_request,
  connector_update_api_key_id_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_UPDATE_API_KEY_ID_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_api_key_id',
  summary: `Update the connector API key ID`,
  description: `Update the connector API key ID.

Update the \`api_key_id\` and \`api_key_secret_id\` fields of a connector.
You can specify the ID of the API key used for authorization and the ID of the connector secret where the API key is stored.
The connector secret ID is required only for Elastic managed (native) connectors.
Self-managed connectors (connector clients) do not use this field.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-api-key-id`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_api_key_id'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-api-key-id',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: ['api_key_id', 'api_key_secret_id'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_update_api_key_id_request, 'body'),
    ...getShapeAt(connector_update_api_key_id_request, 'path'),
    ...getShapeAt(connector_update_api_key_id_request, 'query'),
  }),
  outputSchema: connector_update_api_key_id_response,
};
