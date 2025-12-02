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
 * Source: /oas_docs/output/kibana.yaml, operations: RunScriptAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  run_script_action_request,
  run_script_action_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const RUN_SCRIPT_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RunScriptAction',
  summary: `Run a script`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/runscript</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Run a script on a host. Currently supported only for some agent types.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/runscript'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-runscriptaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(run_script_action_request, 'body'),
    ...getShapeAt(run_script_action_request, 'path'),
    ...getShapeAt(run_script_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: run_script_action_response,
};
