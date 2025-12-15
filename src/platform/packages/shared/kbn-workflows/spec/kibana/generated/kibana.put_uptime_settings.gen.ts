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
 * Source: /oas_docs/output/kibana.yaml, operations: put-uptime-settings
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  put_uptime_settings_request,
  put_uptime_settings_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_UPTIME_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_uptime_settings',
  summary: `Update uptime settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/uptime/settings</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update uptime setting attributes like \`heartbeatIndices\`, \`certExpirationThreshold\`, \`certAgeThreshold\`, \`defaultConnectors\`, or \`defaultEmail\`. You must have \`all\` privileges for the uptime feature in the Observability section of the Kibana feature privileges. A partial update is supported, provided settings keys will be merged with existing settings.
`,
  methods: ['PUT'],
  patterns: ['/api/uptime/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-uptime-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'certAgeThreshold',
      'certExpirationThreshold',
      'defaultConnectors',
      'defaultEmail',
      'heartbeatIndices',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_uptime_settings_request, 'body'),
    ...getShapeAt(put_uptime_settings_request, 'path'),
    ...getShapeAt(put_uptime_settings_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: put_uptime_settings_response,
};
