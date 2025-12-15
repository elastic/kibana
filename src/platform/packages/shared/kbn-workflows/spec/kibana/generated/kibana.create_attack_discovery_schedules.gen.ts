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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateAttackDiscoverySchedules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_attack_discovery_schedules_request,
  create_attack_discovery_schedules_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAttackDiscoverySchedules',
  summary: `Create Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Creates a new Attack discovery schedule that analyzes security alerts at specified intervals. The schedule defines when and how Attack discovery analysis should run, including which alerts to analyze, which AI connector to use, and what actions to take when discoveries are found. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createattackdiscoveryschedules',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['actions', 'enabled', 'name', 'params', 'schedule'],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_attack_discovery_schedules_request, 'body'),
    ...getShapeAt(create_attack_discovery_schedules_request, 'path'),
    ...getShapeAt(create_attack_discovery_schedules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_attack_discovery_schedules_response,
};
