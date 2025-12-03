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
 * Source: /oas_docs/output/kibana.yaml, operations: post-agent-builder-mcp
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_agent_builder_mcp_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_AGENT_BUILDER_MCP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_mcp',
  summary: `MCP server`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/mcp</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

> warn
> This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/mcp'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-mcp',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_agent_builder_mcp_request, 'body'),
    ...getShapeAt(post_agent_builder_mcp_request, 'path'),
    ...getShapeAt(post_agent_builder_mcp_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
