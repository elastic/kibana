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
 * Source: /oas_docs/output/kibana.yaml, operations: searchSingleConfiguration
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_single_configuration_request,
  search_single_configuration_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const SEARCH_SINGLE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.searchSingleConfiguration',
  summary: `Lookup single agent configuration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/settings/agent-configuration/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

This endpoint enables you to search for a single agent configuration and update the 'applied_by_agent' field.
`,
  methods: ['POST'],
  patterns: ['/api/apm/settings/agent-configuration/search'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-searchsingleconfiguration',
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['etag', 'mark_as_applied_by_agent', 'service'],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_single_configuration_request, 'body'),
    ...getShapeAt(search_single_configuration_request, 'path'),
    ...getShapeAt(search_single_configuration_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: search_single_configuration_response,
};
