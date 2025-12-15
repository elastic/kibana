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
 * Source: /oas_docs/output/kibana.yaml, operations: ApplyEntityEngineDataviewIndices
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  apply_entity_engine_dataview_indices_request,
  apply_entity_engine_dataview_indices_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const APPLY_ENTITY_ENGINE_DATAVIEW_INDICES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ApplyEntityEngineDataviewIndices',
  summary: `Apply DataView indices to all installed engines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/engines/apply_dataview_indices</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_store/engines/apply_dataview_indices'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-applyentityenginedataviewindices',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(apply_entity_engine_dataview_indices_request, 'body'),
    ...getShapeAt(apply_entity_engine_dataview_indices_request, 'path'),
    ...getShapeAt(apply_entity_engine_dataview_indices_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: apply_entity_engine_dataview_indices_response,
};
