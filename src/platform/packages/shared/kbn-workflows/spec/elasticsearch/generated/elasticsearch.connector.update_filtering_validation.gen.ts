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
 * Source: elasticsearch-specification repository, operations: connector-update-filtering-validation
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_update_filtering_validation_request,
  connector_update_filtering_validation_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_UPDATE_FILTERING_VALIDATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.update_filtering_validation',
  summary: `Update the connector draft filtering validation`,
  description: `Update the connector draft filtering validation.

Update the draft filtering validation info for a connector.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering-validation`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_filtering/_validation'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering-validation',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: ['validation'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_update_filtering_validation_request, 'body'),
    ...getShapeAt(connector_update_filtering_validation_request, 'path'),
    ...getShapeAt(connector_update_filtering_validation_request, 'query'),
  }),
  outputSchema: connector_update_filtering_validation_response,
};
