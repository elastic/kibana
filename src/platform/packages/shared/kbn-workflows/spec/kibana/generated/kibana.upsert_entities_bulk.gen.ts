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
 * Source: /oas_docs/output/kibana.yaml, operations: UpsertEntitiesBulk
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { upsert_entities_bulk_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPSERT_ENTITIES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpsertEntitiesBulk',
  summary: `Upsert many entities in Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/entities/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update or create many entities in Entity Store.
If the specified entity already exists, it is updated with the provided values.  If the entity does not exist, a new one is created.
The creation is asynchronous. The time for a document to be present in the  final index depends on the entity store transform and usually takes more than 1 minute.
`,
  methods: ['PUT'],
  patterns: ['/api/entity_store/entities/bulk'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-upsertentitiesbulk',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['force'],
    bodyParams: ['entities'],
  },
  paramsSchema: z.object({
    ...getShapeAt(upsert_entities_bulk_request, 'body'),
    ...getShapeAt(upsert_entities_bulk_request, 'path'),
    ...getShapeAt(upsert_entities_bulk_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
