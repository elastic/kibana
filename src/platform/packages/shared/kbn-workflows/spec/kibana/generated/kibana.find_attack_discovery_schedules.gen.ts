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
 * Source: /oas_docs/output/kibana.yaml, operations: FindAttackDiscoverySchedules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  find_attack_discovery_schedules_request,
  find_attack_discovery_schedules_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_ATTACK_DISCOVERY_SCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAttackDiscoverySchedules',
  summary: `Finds Attack discovery schedules that match the search criteria`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finds Attack discovery schedules that match the search criteria. Supports pagination and sorting by various fields. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/schedules/_find'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findattackdiscoveryschedules',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'per_page', 'sort_field', 'sort_direction'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_attack_discovery_schedules_request, 'body'),
    ...getShapeAt(find_attack_discovery_schedules_request, 'path'),
    ...getShapeAt(find_attack_discovery_schedules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_attack_discovery_schedules_response,
};
