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
 * Source: /oas_docs/output/kibana.yaml, operations: post-spaces-update-objects-spaces
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_spaces_update_objects_spaces_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SPACES_UPDATE_OBJECTS_SPACES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_update_objects_spaces',
  summary: `Update saved objects in spaces`,
  description: `Update one or more saved objects to add or remove them from some spaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_update_objects_spaces'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-update-objects-spaces',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['objects', 'spacesToAdd', 'spacesToRemove'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_spaces_update_objects_spaces_request, 'body'),
    ...getShapeAt(post_spaces_update_objects_spaces_request, 'path'),
    ...getShapeAt(post_spaces_update_objects_spaces_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
