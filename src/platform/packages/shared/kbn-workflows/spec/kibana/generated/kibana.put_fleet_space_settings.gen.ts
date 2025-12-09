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
 * Source: /oas_docs/output/kibana.yaml, operations: put-fleet-space-settings
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  put_fleet_space_settings_request,
  put_fleet_space_settings_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_FLEET_SPACE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_space_settings',
  summary: `Create space settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/space_settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/space_settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-fleet-space-settings',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['allowed_namespace_prefixes'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_fleet_space_settings_request, 'body'),
    ...getShapeAt(put_fleet_space_settings_request, 'path'),
    ...getShapeAt(put_fleet_space_settings_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: put_fleet_space_settings_response,
};
