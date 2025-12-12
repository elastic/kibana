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
 * Source: /oas_docs/output/kibana.yaml, operations: put-agent-builder-tools-toolid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_agent_builder_tools_toolid_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_AGENT_BUILDER_TOOLS_TOOLID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_agent_builder_tools_toolid',
  summary: `Update a tool`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/tools/{toolId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing tool. Use this endpoint to modify any aspect of the tool's configuration or metadata.<br/><br/>[Required authorization] Route required privileges: manage_onechat.`,
  methods: ['PUT'],
  patterns: ['/api/agent_builder/tools/{toolId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-agent-builder-tools-toolid',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['toolId'],
    urlParams: [],
    bodyParams: ['configuration', 'description', 'tags'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_agent_builder_tools_toolid_request, 'body'),
    ...getShapeAt(put_agent_builder_tools_toolid_request, 'path'),
    ...getShapeAt(put_agent_builder_tools_toolid_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
