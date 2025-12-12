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
 * Source: /oas_docs/output/kibana.yaml, operations: post-agent-builder-tools
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_agent_builder_tools_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_AGENT_BUILDER_TOOLS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_tools',
  summary: `Create a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new tool. Use this endpoint to define a custom tool with specific functionality and configuration for use by agents.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/tools'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-tools',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['configuration', 'description', 'id', 'tags', 'type'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_agent_builder_tools_request, 'body'),
    ...getShapeAt(post_agent_builder_tools_request, 'path'),
    ...getShapeAt(post_agent_builder_tools_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
