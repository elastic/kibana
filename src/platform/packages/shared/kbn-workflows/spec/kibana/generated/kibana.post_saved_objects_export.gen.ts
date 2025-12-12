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
 * Source: /oas_docs/output/kibana.yaml, operations: post-saved-objects-export
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_saved_objects_export_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SAVED_OBJECTS_EXPORT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_saved_objects_export',
  summary: `Export saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve sets of saved objects that you want to import into Kibana. You must include \`type\` or \`objects\` in the request body. The output of exporting saved objects must be treated as opaque. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.

NOTE: The \`savedObjects.maxImportExportSize\` configuration setting limits the number of saved objects which may be exported.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_export'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-saved-objects-export',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'excludeExportDetails',
      'hasReference',
      'includeReferencesDeep',
      'objects',
      'search',
      'type',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_saved_objects_export_request, 'body'),
    ...getShapeAt(post_saved_objects_export_request, 'path'),
    ...getShapeAt(post_saved_objects_export_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
