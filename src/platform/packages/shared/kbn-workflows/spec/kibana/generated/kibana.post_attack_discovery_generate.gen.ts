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
 * Source: /oas_docs/output/kibana.yaml, operations: PostAttackDiscoveryGenerate
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_attack_discovery_generate_request,
  post_attack_discovery_generate_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_ATTACK_DISCOVERY_GENERATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryGenerate',
  summary: `Generate attack discoveries from alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_generate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiates the generation of attack discoveries by analyzing security alerts using AI. Returns an execution UUID that can be used to track the generation progress and retrieve results. Results may also be retrieved via the find endpoint. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/_generate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-postattackdiscoverygenerate',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'alertsIndexPattern',
      'anonymizationFields',
      'apiConfig',
      'connectorName',
      'end',
      'filter',
      'model',
      'replacements',
      'size',
      'start',
      'subAction',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_attack_discovery_generate_request, 'body'),
    ...getShapeAt(post_attack_discovery_generate_request, 'path'),
    ...getShapeAt(post_attack_discovery_generate_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_attack_discovery_generate_response,
};
