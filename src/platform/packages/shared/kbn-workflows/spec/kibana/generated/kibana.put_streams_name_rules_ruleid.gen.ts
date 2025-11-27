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
 * Source: /oas_docs/output/kibana.yaml, operations: put-streams-name-rules-ruleid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_streams_name_rules_ruleid_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';
import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_STREAMS_NAME_RULES_RULEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_rules_ruleid',
  connectorGroup: 'internal',
  summary: `Link a rule to a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/rules/{ruleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Links a rule to a stream. Noop if the rule is already linked to the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/rules/{ruleId}'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'ruleId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_streams_name_rules_ruleid_request, 'body'),
    ...getShapeAt(put_streams_name_rules_ruleid_request, 'path'),
    ...getShapeAt(put_streams_name_rules_ruleid_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
