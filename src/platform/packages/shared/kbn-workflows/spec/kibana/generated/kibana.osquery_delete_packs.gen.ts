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
 * Source: /oas_docs/output/kibana.yaml, operations: OsqueryDeletePacks
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  osquery_delete_packs_request,
  osquery_delete_packs_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OSQUERY_DELETE_PACKS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryDeletePacks',
  summary: `Delete a pack`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/packs/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a query pack using the pack ID.`,
  methods: ['DELETE'],
  patterns: ['/api/osquery/packs/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerydeletepacks',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(osquery_delete_packs_request, 'body'),
    ...getShapeAt(osquery_delete_packs_request, 'path'),
    ...getShapeAt(osquery_delete_packs_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: osquery_delete_packs_response,
};
