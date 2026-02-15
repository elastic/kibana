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
 * Source: /oas_docs/output/kibana.yaml, operations: SetAlertsStatus
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  set_alerts_status_request,
  set_alerts_status_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema, KibanaStepMetaSchema } from '../../schema';

// export contract
export const SET_ALERTS_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertsStatus',
  summary: `Set a detection alert status`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Set the status of one or more detection alerts.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/status'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setalertsstatus',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['reason', 'signal_ids', 'status', 'conflicts', 'query'],
  },
  paramsSchema: z.object({
    ...getShapeAt(set_alerts_status_request, 'body'),
    ...getShapeAt(set_alerts_status_request, 'path'),
    ...getShapeAt(set_alerts_status_request, 'query'),
    fetcher: FetcherConfigSchema,
    ...KibanaStepMetaSchema,
  }),
  outputSchema: set_alerts_status_response,
};
