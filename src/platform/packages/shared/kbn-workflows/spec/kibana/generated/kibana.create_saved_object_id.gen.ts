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
 * Source: /oas_docs/output/kibana.yaml, operations: createSavedObjectId
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_saved_object_id_request,
  create_saved_object_id_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_SAVED_OBJECT_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObjectId',
  summary: `Create a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object and specify its identifier instead of using a randomly generated ID.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/{type}/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createsavedobjectid',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id', 'type'],
    urlParams: ['overwrite'],
    bodyParams: ['attributes', 'initialNamespaces', 'references'],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_saved_object_id_request, 'body'),
    ...getShapeAt(create_saved_object_id_request, 'path'),
    ...getShapeAt(create_saved_object_id_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_saved_object_id_response,
};
