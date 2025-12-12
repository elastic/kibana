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
 * Source: /oas_docs/output/kibana.yaml, operations: GetAttackDiscoveryGeneration
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_attack_discovery_generation_request,
  get_attack_discovery_generation_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_ATTACK_DISCOVERY_GENERATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetAttackDiscoveryGeneration',
  summary: `Get a single Attack discovery generation, including its discoveries and (optional) generation metadata`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Returns a specific Attack discovery generation, including all generated Attack discoveries and associated metadata, including execution status and statistics. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getattackdiscoverygeneration',
  parameterTypes: {
    headerParams: [],
    pathParams: ['execution_uuid'],
    urlParams: ['enable_field_rendering', 'with_replacements'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_attack_discovery_generation_request, 'body'),
    ...getShapeAt(get_attack_discovery_generation_request, 'path'),
    ...getShapeAt(get_attack_discovery_generation_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_attack_discovery_generation_response,
};
