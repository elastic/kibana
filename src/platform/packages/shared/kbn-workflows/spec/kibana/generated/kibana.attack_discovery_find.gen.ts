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
 * Source: /oas_docs/output/kibana.yaml, operations: AttackDiscoveryFind
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  attack_discovery_find_request,
  attack_discovery_find_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ATTACK_DISCOVERY_FIND_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AttackDiscoveryFind',
  summary: `Find Attack discoveries that match the search criteria`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find Attack discoveries that match the search criteria. Supports free text search, filtering, pagination, and sorting. \`Technical preview\``,
  methods: ['GET'],
  patterns: ['/api/attack_discovery/_find'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-attackdiscoveryfind',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'alert_ids',
      'connector_names',
      'enable_field_rendering',
      'end',
      'ids',
      'include_unique_alert_ids',
      'page',
      'per_page',
      'search',
      'shared',
      'sort_field',
      'sort_order',
      'start',
      'status',
      'with_replacements',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(attack_discovery_find_request, 'body'),
    ...getShapeAt(attack_discovery_find_request, 'path'),
    ...getShapeAt(attack_discovery_find_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: attack_discovery_find_response,
};
