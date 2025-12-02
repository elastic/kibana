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
 * Source: /oas_docs/output/kibana.yaml, operations: post-spaces-disable-legacy-url-aliases
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_spaces_disable_legacy_url_aliases_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SPACES_DISABLE_LEGACY_URL_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_spaces_disable_legacy_url_aliases',
  summary: `Disable legacy URL aliases`,
  description: null,
  methods: ['POST'],
  patterns: ['/api/spaces/_disable_legacy_url_aliases'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-disable-legacy-url-aliases',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['aliases'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_spaces_disable_legacy_url_aliases_request, 'body'),
    ...getShapeAt(post_spaces_disable_legacy_url_aliases_request, 'path'),
    ...getShapeAt(post_spaces_disable_legacy_url_aliases_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
