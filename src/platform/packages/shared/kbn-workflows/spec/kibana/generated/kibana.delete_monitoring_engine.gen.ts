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
 * Source: /oas_docs/output/kibana.yaml, operations: DeleteMonitoringEngine
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_monitoring_engine_request,
  delete_monitoring_engine_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_MONITORING_ENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteMonitoringEngine',
  summary: `Delete the Privilege Monitoring Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/engine/delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['DELETE'],
  patterns: ['/api/entity_analytics/monitoring/engine/delete'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletemonitoringengine',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['data'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_monitoring_engine_request, 'body'),
    ...getShapeAt(delete_monitoring_engine_request, 'path'),
    ...getShapeAt(delete_monitoring_engine_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_monitoring_engine_response,
};
