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
 * Source: /oas_docs/output/kibana.yaml, operations: PrivMonHealth
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  priv_mon_health_request,
  priv_mon_health_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PRIV_MON_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivMonHealth',
  summary: `Health check on Privilege Monitoring`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/privileges/health</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_analytics/monitoring/privileges/health'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-privmonhealth',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(priv_mon_health_request, 'body'),
    ...getShapeAt(priv_mon_health_request, 'path'),
    ...getShapeAt(priv_mon_health_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: priv_mon_health_response,
};
