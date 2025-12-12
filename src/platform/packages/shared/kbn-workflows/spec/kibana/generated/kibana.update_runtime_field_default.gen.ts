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
 * Source: /oas_docs/output/kibana.yaml, operations: updateRuntimeFieldDefault
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { update_runtime_field_default_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_RUNTIME_FIELD_DEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateRuntimeFieldDefault',
  summary: `Update a runtime field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}/runtime_field/{fieldName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateruntimefielddefault',
  parameterTypes: {
    headerParams: [],
    pathParams: ['fieldName', 'viewId'],
    urlParams: [],
    bodyParams: ['runtimeField'],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_runtime_field_default_request, 'body'),
    ...getShapeAt(update_runtime_field_default_request, 'path'),
    ...getShapeAt(update_runtime_field_default_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
