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
 * Source: /oas_docs/output/kibana.yaml, operations: resolveSavedObject
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  resolve_saved_object_request,
  resolve_saved_object_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const RESOLVE_SAVED_OBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolveSavedObject',
  summary: `Resolve a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/resolve/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a single Kibana saved object by identifier using any legacy URL alias if it exists. Under certain circumstances, when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved using either its new ID or its old ID.
`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/resolve/{type}/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resolvesavedobject',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id', 'type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(resolve_saved_object_request, 'body'),
    ...getShapeAt(resolve_saved_object_request, 'path'),
    ...getShapeAt(resolve_saved_object_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: resolve_saved_object_response,
};
