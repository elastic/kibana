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
 * Source: /oas_docs/output/kibana.yaml, operations: post-spaces-get-shareable-references
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_spaces_get_shareable_references_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SPACES_GET_SHAREABLE_REFERENCES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_get_shareable_references',
  summary: `Get shareable references`,
  description: `Collect references and space contexts for saved objects.`,
  methods: ['POST'],
  patterns: ['/api/spaces/_get_shareable_references'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-get-shareable-references',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['objects'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_spaces_get_shareable_references_request, 'body'),
    ...getShapeAt(post_spaces_get_shareable_references_request, 'path'),
    ...getShapeAt(post_spaces_get_shareable_references_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
