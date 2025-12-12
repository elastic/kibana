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
 * Source: /oas_docs/output/kibana.yaml, operations: ConfigureRiskEngineSavedObject
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  configure_risk_engine_saved_object_request,
  configure_risk_engine_saved_object_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CONFIGURE_RISK_ENGINE_SAVED_OBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ConfigureRiskEngineSavedObject',
  summary: `Configure the Risk Engine Saved Object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/risk_score/engine/saved_object/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Configuring the Risk Engine Saved Object`,
  methods: ['PATCH'],
  patterns: ['/api/risk_score/engine/saved_object/configure'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-configureriskenginesavedobject',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'enable_reset_to_zero',
      'exclude_alert_statuses',
      'exclude_alert_tags',
      'filters',
      'range',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(configure_risk_engine_saved_object_request, 'body'),
    ...getShapeAt(configure_risk_engine_saved_object_request, 'path'),
    ...getShapeAt(configure_risk_engine_saved_object_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: configure_risk_engine_saved_object_response,
};
