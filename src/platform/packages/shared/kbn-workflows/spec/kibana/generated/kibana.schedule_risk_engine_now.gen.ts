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
 * Source: /oas_docs/output/kibana.yaml, operations: ScheduleRiskEngineNow
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  schedule_risk_engine_now_request,
  schedule_risk_engine_now_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const SCHEDULE_RISK_ENGINE_NOW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ScheduleRiskEngineNow',
  summary: `Run the risk scoring engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/schedule_now</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Schedule the risk scoring engine to run as soon as possible. You can use this to recalculate entity risk scores after updating their asset criticality.`,
  methods: ['POST'],
  patterns: ['/api/risk_score/engine/schedule_now'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-scheduleriskenginenow',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(schedule_risk_engine_now_request, 'body'),
    ...getShapeAt(schedule_risk_engine_now_request, 'path'),
    ...getShapeAt(schedule_risk_engine_now_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: schedule_risk_engine_now_response,
};
