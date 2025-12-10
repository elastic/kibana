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
 * Source: /oas_docs/output/kibana.yaml, operations: CleanUpRiskEngine
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  clean_up_risk_engine_request,
  clean_up_risk_engine_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CLEAN_UP_RISK_ENGINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanUpRiskEngine',
  summary: `Cleanup the Risk Engine`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/dangerously_delete_data</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cleaning up the the Risk Engine by removing the indices, mapping and transforms`,
  methods: ['DELETE'],
  patterns: ['/api/risk_score/engine/dangerously_delete_data'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-cleanupriskengine',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(clean_up_risk_engine_request, 'body'),
    ...getShapeAt(clean_up_risk_engine_request, 'path'),
    ...getShapeAt(clean_up_risk_engine_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: clean_up_risk_engine_response,
};
