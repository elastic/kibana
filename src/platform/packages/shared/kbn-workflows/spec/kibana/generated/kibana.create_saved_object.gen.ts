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
 * Source: /oas_docs/output/kibana.yaml, operations: createSavedObject
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_saved_object_request,
  create_saved_object_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_SAVED_OBJECT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createSavedObject',
  summary: `Create a saved object`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/{type}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a Kibana saved object with a randomly generated identifier.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/{type}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createsavedobject',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['type'],
    urlParams: ['overwrite'],
    bodyParams: ['attributes', 'initialNamespaces', 'references'],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_saved_object_request, 'body'),
    ...getShapeAt(create_saved_object_request, 'path'),
    ...getShapeAt(create_saved_object_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_saved_object_response,
};
