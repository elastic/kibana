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
 * Source: /oas_docs/output/kibana.yaml, operations: UpdatePrivMonUser
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  update_priv_mon_user_request,
  update_priv_mon_user_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_PRIV_MON_USER_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdatePrivMonUser',
  summary: `Update a monitored user`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['PUT'],
  patterns: ['/api/entity_analytics/monitoring/users/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateprivmonuser',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['entity_analytics_monitoring', 'id', 'labels', 'user'],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_priv_mon_user_request, 'body'),
    ...getShapeAt(update_priv_mon_user_request, 'path'),
    ...getShapeAt(update_priv_mon_user_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_priv_mon_user_response,
};
