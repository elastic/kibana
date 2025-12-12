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
 * Source: /oas_docs/output/kibana.yaml, operations: OsqueryCreatePacks
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  osquery_create_packs_request,
  osquery_create_packs_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OSQUERY_CREATE_PACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreatePacks',
  summary: `Create a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a query pack.`,
  methods: ['POST'],
  patterns: ['/api/osquery/packs'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerycreatepacks',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['description', 'enabled', 'name', 'policy_ids', 'queries', 'shards'],
  },
  paramsSchema: z.object({
    ...getShapeAt(osquery_create_packs_request, 'body'),
    ...getShapeAt(osquery_create_packs_request, 'path'),
    ...getShapeAt(osquery_create_packs_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: osquery_create_packs_response,
};
