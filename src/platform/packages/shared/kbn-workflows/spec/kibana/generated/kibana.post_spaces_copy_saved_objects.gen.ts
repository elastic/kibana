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
 * Source: /oas_docs/output/kibana.yaml, operations: post-spaces-copy-saved-objects
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_spaces_copy_saved_objects_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SPACES_COPY_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_copy_saved_objects',
  summary: `Copy saved objects between spaces`,
  description: `It also allows you to automatically copy related objects, so when you copy a dashboard, this can automatically copy over the associated visualizations, data views, and saved Discover sessions, as required. You can request to overwrite any objects that already exist in the target space if they share an identifier or you can use the resolve copy saved objects conflicts API to do this on a per-object basis.<br/><br/>[Required authorization] Route required privileges: copySavedObjectsToSpaces.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_copy_saved_objects'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-copy-saved-objects',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'compatibilityMode',
      'createNewCopies',
      'includeReferences',
      'objects',
      'overwrite',
      'spaces',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_spaces_copy_saved_objects_request, 'body'),
    ...getShapeAt(post_spaces_copy_saved_objects_request, 'path'),
    ...getShapeAt(post_spaces_copy_saved_objects_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
