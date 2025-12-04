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
 * Source: /oas_docs/output/kibana.yaml, operations: UpsertEntity
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { upsert_entity_request, upsert_entity_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPSERT_ENTITY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntity',
  summary: `Upsert an entity in Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/{entityType}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update or create an entity in Entity Store.
If the specified entity already exists, it is updated with the provided values.  If the entity does not exist, a new one is created. By default, only the following fields can be updated: * \`entity.attributes.*\` * \`entity.lifecycle.*\` * \`entity.behavior.*\` To update other fields, set the \`force\` query parameter to \`true\`. > info > Some fields always retain the first observed value. Updates to these fields will not appear in the final index.
> Due to technical limitations, not all updates are guaranteed to appear in the final list of observed values.
> Due to technical limitations, create is an async operation. The time for a document to be present in the  > final index depends on the entity store transform and usually takes more than 1 minute.
`,
  methods: ['PUT'],
  patterns: ['/api/entity_store/entities/{entityType}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-upsertentity',
  parameterTypes: {
    headerParams: [],
    pathParams: ['entityType'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(upsert_entity_request, 'body'),
    ...getShapeAt(upsert_entity_request, 'path'),
    ...getShapeAt(upsert_entity_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: upsert_entity_response,
};
