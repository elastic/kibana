/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * OVERRIDE FILE
 *
 * Source: /oas_docs/output/kibana.yaml, operations: SetAlertsStatus
 */

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { insertFetcherToSchemaRecursively } from '../../lib/insert_fetcher_to_schema';
import {
  set_alerts_status_request,
  set_alerts_status_response,
} from '../generated/schemas/kibana_openapi_zod.gen';

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
  paramsSchema: insertFetcherToSchemaRecursively(set_alerts_status_request.shape.body),
  outputSchema: set_alerts_status_response,
};
