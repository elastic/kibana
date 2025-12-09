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
 * Source: elasticsearch-specification repository, operations: connector-update-filtering
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_update_filtering_request,
  connector_update_filtering_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_UPDATE_FILTERING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_filtering',
  summary: `Update the connector filtering`,
  description: `Update the connector filtering.

Update the draft filtering configuration of a connector and marks the draft validation state as edited.
The filtering draft is activated once validated by the running Elastic connector service.
The filtering property is used to configure sync rules (both basic and advanced) for a connector.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_filtering'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: ['filtering', 'rules', 'advanced_snippet'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_update_filtering_request, 'body'),
    ...getShapeAt(connector_update_filtering_request, 'path'),
    ...getShapeAt(connector_update_filtering_request, 'query'),
  }),
  outputSchema: connector_update_filtering_response,
};
