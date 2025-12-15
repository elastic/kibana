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
 * Source: /oas_docs/output/kibana.yaml, operations: post-private-location
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_private_location_request,
  post_private_location_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_private_location',
  summary: `Create a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.`,
  methods: ['POST'],
  patterns: ['/api/synthetics/private_locations'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-private-location',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agentPolicyId', 'geo', 'label', 'spaces', 'tags'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_private_location_request, 'body'),
    ...getShapeAt(post_private_location_request, 'path'),
    ...getShapeAt(post_private_location_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_private_location_response,
};
