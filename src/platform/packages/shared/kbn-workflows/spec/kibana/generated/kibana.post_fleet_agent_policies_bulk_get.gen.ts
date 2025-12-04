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
 * Source: /oas_docs/output/kibana.yaml, operations: post-fleet-agent-policies-bulk-get
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_fleet_agent_policies_bulk_get_request,
  post_fleet_agent_policies_bulk_get_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_FLEET_AGENT_POLICIES_BULK_GET_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_bulk_get',
  summary: `Bulk get agent policies`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/_bulk_get</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-read OR fleet-agents-read OR fleet-setup.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/_bulk_get'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-fleet-agent-policies-bulk-get',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['format'],
    bodyParams: ['full', 'ids', 'ignoreMissing'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_fleet_agent_policies_bulk_get_request, 'body'),
    ...getShapeAt(post_fleet_agent_policies_bulk_get_request, 'path'),
    ...getShapeAt(post_fleet_agent_policies_bulk_get_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_fleet_agent_policies_bulk_get_response,
};
