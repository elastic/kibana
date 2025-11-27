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
 * Generated at: 2025-11-27T07:43:24.876Z
 * Source: elasticsearch-specification repository, operations: indices-explain-data-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_explain_data_lifecycle_request,
  indices_explain_data_lifecycle_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_EXPLAIN_DATA_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.explain_data_lifecycle',
  connectorGroup: 'internal',
  summary: `Get the status for a data stream lifecycle`,
  description: `Get the status for a data stream lifecycle.

Get information about an index or data stream's current data stream lifecycle status, such as time since index creation, time since rollover, the lifecycle configuration managing the index, or any errors encountered during lifecycle execution.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-explain-data-lifecycle`,
  methods: ['GET'],
  patterns: ['{index}/_lifecycle/explain'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-explain-data-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['include_defaults', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_explain_data_lifecycle_request, 'body'),
    ...getShapeAt(indices_explain_data_lifecycle_request, 'path'),
    ...getShapeAt(indices_explain_data_lifecycle_request, 'query'),
  }),
  outputSchema: indices_explain_data_lifecycle_response,
};
