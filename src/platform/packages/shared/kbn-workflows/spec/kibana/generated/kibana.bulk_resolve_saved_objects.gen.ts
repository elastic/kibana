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
 * Source: /oas_docs/output/kibana.yaml, operations: bulkResolveSavedObjects
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  bulk_resolve_saved_objects_request,
  bulk_resolve_saved_objects_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const BULK_RESOLVE_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkResolveSavedObjects',
  summary: `Resolve saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve multiple Kibana saved objects by identifier using any legacy URL aliases if they exist. Under certain circumstances when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved by the bulk resolve API using either its new ID or its old ID.
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_resolve'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkresolvesavedobjects',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(bulk_resolve_saved_objects_request, 'body'),
    ...getShapeAt(bulk_resolve_saved_objects_request, 'path'),
    ...getShapeAt(bulk_resolve_saved_objects_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: bulk_resolve_saved_objects_response,
};
