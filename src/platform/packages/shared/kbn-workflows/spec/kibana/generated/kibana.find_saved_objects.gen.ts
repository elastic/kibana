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
 * Source: /oas_docs/output/kibana.yaml, operations: findSavedObjects
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  find_saved_objects_request,
  find_saved_objects_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findSavedObjects',
  summary: `Search for saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated set of Kibana saved objects.`,
  methods: ['GET'],
  patterns: ['/api/saved_objects/_find'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findsavedobjects',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'aggs',
      'default_search_operator',
      'fields',
      'filter',
      'has_no_reference',
      'has_no_reference_operator',
      'has_reference',
      'has_reference_operator',
      'page',
      'per_page',
      'search',
      'search_fields',
      'sort_field',
      'type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_saved_objects_request, 'body'),
    ...getShapeAt(find_saved_objects_request, 'path'),
    ...getShapeAt(find_saved_objects_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_saved_objects_response,
};
