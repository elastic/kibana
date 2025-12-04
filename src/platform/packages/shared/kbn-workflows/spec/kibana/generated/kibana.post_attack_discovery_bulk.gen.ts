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
 * Source: /oas_docs/output/kibana.yaml, operations: PostAttackDiscoveryBulk
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_attack_discovery_bulk_request,
  post_attack_discovery_bulk_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_ATTACK_DISCOVERY_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PostAttackDiscoveryBulk',
  summary: `Bulk update Attack discoveries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Performs bulk updates on multiple Attack discoveries, including workflow status changes and visibility settings. This endpoint allows efficient batch processing of alert modifications without requiring individual API calls for each alert. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/_bulk'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-postattackdiscoverybulk',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['update'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_attack_discovery_bulk_request, 'body'),
    ...getShapeAt(post_attack_discovery_bulk_request, 'path'),
    ...getShapeAt(post_attack_discovery_bulk_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_attack_discovery_bulk_response,
};
