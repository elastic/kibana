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
 * Source: /oas_docs/output/kibana.yaml, operations: post-fleet-agent-policies
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_fleet_agent_policies_request,
  post_fleet_agent_policies_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_FLEET_AGENT_POLICIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_agent_policies',
  summary: `Create an agent policy`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agent_policies</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-agent-policies-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/agent_policies'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-fleet-agent-policies',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['sys_monitoring'],
    bodyParams: [
      'advanced_settings',
      'agent_features',
      'agentless',
      'data_output_id',
      'description',
      'download_source_id',
      'fleet_server_host_id',
      'force',
      'global_data_tags',
      'has_fleet_server',
      'id',
      'inactivity_timeout',
      'is_default',
      'is_default_fleet_server',
      'is_managed',
      'is_protected',
      'keep_monitoring_alive',
      'monitoring_diagnostics',
      'monitoring_enabled',
      'monitoring_http',
      'monitoring_output_id',
      'monitoring_pprof_enabled',
      'name',
      'namespace',
      'overrides',
      'required_versions',
      'space_ids',
      'supports_agentless',
      'unenroll_timeout',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_fleet_agent_policies_request, 'body'),
    ...getShapeAt(post_fleet_agent_policies_request, 'path'),
    ...getShapeAt(post_fleet_agent_policies_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_fleet_agent_policies_response,
};
