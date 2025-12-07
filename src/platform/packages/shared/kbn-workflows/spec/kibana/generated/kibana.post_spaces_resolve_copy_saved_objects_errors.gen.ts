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
 * Source: /oas_docs/output/kibana.yaml, operations: post-spaces-resolve-copy-saved-objects-errors
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_spaces_resolve_copy_saved_objects_errors_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SPACES_RESOLVE_COPY_SAVED_OBJECTS_ERRORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_resolve_copy_saved_objects_errors',
  summary: `Resolve conflicts copying saved objects`,
  description: `Overwrite saved objects that are returned as errors from the copy saved objects to space API.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_resolve_copy_saved_objects_errors'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-resolve-copy-saved-objects-errors',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['compatibilityMode', 'createNewCopies', 'includeReferences', 'objects', 'retries'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_spaces_resolve_copy_saved_objects_errors_request, 'body'),
    ...getShapeAt(post_spaces_resolve_copy_saved_objects_errors_request, 'path'),
    ...getShapeAt(post_spaces_resolve_copy_saved_objects_errors_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
