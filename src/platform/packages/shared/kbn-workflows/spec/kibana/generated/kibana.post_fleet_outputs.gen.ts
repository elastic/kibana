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
 * Source: /oas_docs/output/kibana.yaml, operations: post-fleet-outputs
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_fleet_outputs_request,
  post_fleet_outputs_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_FLEET_OUTPUTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_fleet_outputs',
  summary: `Create output`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/outputs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['POST'],
  patterns: ['/api/fleet/outputs'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-fleet-outputs',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'allow_edit',
      'ca_sha256',
      'ca_trusted_fingerprint',
      'config_yaml',
      'hosts',
      'id',
      'is_default',
      'is_default_monitoring',
      'is_internal',
      'is_preconfigured',
      'name',
      'preset',
      'proxy_id',
      'secrets',
      'shipper',
      'ssl',
      'type',
      'write_to_logs_streams',
      'kibana_api_key',
      'kibana_url',
      'service_token',
      'sync_integrations',
      'sync_uninstalled_integrations',
      'auth_type',
      'broker_timeout',
      'client_id',
      'compression',
      'compression_level',
      'connection_type',
      'hash',
      'headers',
      'key',
      'partition',
      'password',
      'random',
      'required_acks',
      'round_robin',
      'sasl',
      'timeout',
      'topic',
      'username',
      'version',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_fleet_outputs_request, 'body'),
    ...getShapeAt(post_fleet_outputs_request, 'path'),
    ...getShapeAt(post_fleet_outputs_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_fleet_outputs_response,
};
