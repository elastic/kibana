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
 * Source: /oas_docs/output/kibana.yaml, operations: PostAttackDiscoveryGenerationsDismiss
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_attack_discovery_generations_dismiss_request,
  post_attack_discovery_generations_dismiss_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_ATTACK_DISCOVERY_GENERATIONS_DISMISS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerationsDismiss',
  summary: `Dismiss an attack discovery generation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/generations/{execution_uuid}/_dismiss</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Dismisses an attack discovery generation for the current user, indicating that it's status should not be reported in the UI. This sets the generation's status to "dismissed" and affects how the generation appears in subsequent queries. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/generations/{execution_uuid}/_dismiss'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-postattackdiscoverygenerationsdismiss',
  parameterTypes: {
    headerParams: [],
    pathParams: ['execution_uuid'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_attack_discovery_generations_dismiss_request, 'body'),
    ...getShapeAt(post_attack_discovery_generations_dismiss_request, 'path'),
    ...getShapeAt(post_attack_discovery_generations_dismiss_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_attack_discovery_generations_dismiss_response,
};
