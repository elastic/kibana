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
 * Source: /oas_docs/output/kibana.yaml, operations: createUpdateAgentConfiguration
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_update_agent_configuration_request,
  create_update_agent_configuration_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_UPDATE_AGENT_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createUpdateAgentConfiguration',
  summary: `Create or update agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/apm/settings/agent-configuration'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createupdateagentconfiguration',
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: ['agent_name', 'service', 'settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_update_agent_configuration_request, 'body'),
    ...getShapeAt(create_update_agent_configuration_request, 'path'),
    ...getShapeAt(create_update_agent_configuration_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_update_agent_configuration_response,
};
