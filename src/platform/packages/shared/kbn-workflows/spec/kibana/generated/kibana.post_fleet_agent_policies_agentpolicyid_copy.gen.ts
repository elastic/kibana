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
 * Source: /oas_docs/output/kibana.yaml, operations: post-fleet-agent-policies-agentpolicyid-copy
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_fleet_agent_policies_agentpolicyid_copy_request,
  post_fleet_agent_policies_agentpolicyid_copy_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_FLEET_AGENT_POLICIES_AGENTPOLICYID_COPY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies_agentpolicyid_copy',
  summary: `Copy an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies/{agentPolicyId}/copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copy an agent policy by ID.<br/><br/>[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies/{agentPolicyId}/copy'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-fleet-agent-policies-agentpolicyid-copy',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['agentPolicyId'],
    urlParams: ['format'],
    bodyParams: ['description', 'name'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_fleet_agent_policies_agentpolicyid_copy_request, 'body'),
    ...getShapeAt(post_fleet_agent_policies_agentpolicyid_copy_request, 'path'),
    ...getShapeAt(post_fleet_agent_policies_agentpolicyid_copy_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_fleet_agent_policies_agentpolicyid_copy_response,
};
