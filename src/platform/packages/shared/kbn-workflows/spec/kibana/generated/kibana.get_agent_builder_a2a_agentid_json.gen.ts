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
 * Source: /oas_docs/output/kibana.yaml, operations: get-agent-builder-a2a-agentid.json
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_agent_builder_a2a_agentid_json_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_AGENT_BUILDER_A2A_AGENTID_JSON_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_agent_builder_a2a_agentid_json',
  summary: `Get A2A agent card`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/a2a/{agentId}.json</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get agent discovery metadata in JSON format. Use this endpoint to provide agent information for A2A protocol integration and discovery.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['GET'],
  patterns: ['/api/agent_builder/a2a/{agentId}.json'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-a2a-agentid.json',
  parameterTypes: {
    headerParams: [],
    pathParams: ['agentId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_agent_builder_a2a_agentid_json_request, 'body'),
    ...getShapeAt(get_agent_builder_a2a_agentid_json_request, 'path'),
    ...getShapeAt(get_agent_builder_a2a_agentid_json_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
