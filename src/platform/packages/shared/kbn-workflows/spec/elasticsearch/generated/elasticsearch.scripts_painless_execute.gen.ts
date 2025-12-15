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
 * Source: elasticsearch-specification repository, operations: scripts-painless-execute, scripts-painless-execute-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  scripts_painless_execute1_request,
  scripts_painless_execute1_response,
  scripts_painless_execute_request,
  scripts_painless_execute_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SCRIPTS_PAINLESS_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.scripts_painless_execute',
  summary: `Run a script`,
  description: `Run a script.

Runs a script and returns a result.
Use this API to build and test scripts, such as when defining a script for a runtime field.
This API requires very few dependencies and is especially useful if you don't have permissions to write documents on a cluster.

The API uses several _contexts_, which control how scripts are run, what variables are available at runtime, and what the return type is.

Each context requires a script, but additional parameters depend on the context you're using for that script.

 Documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-api-examples`,
  methods: ['GET', 'POST'],
  patterns: ['_scripts/painless/_execute'],
  documentation:
    'https://www.elastic.co/docs/reference/scripting-languages/painless/painless-api-examples',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['context', 'context_setup', 'script'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(scripts_painless_execute_request, 'body'),
      ...getShapeAt(scripts_painless_execute_request, 'path'),
      ...getShapeAt(scripts_painless_execute_request, 'query'),
    }),
    z.object({
      ...getShapeAt(scripts_painless_execute1_request, 'body'),
      ...getShapeAt(scripts_painless_execute1_request, 'path'),
      ...getShapeAt(scripts_painless_execute1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([scripts_painless_execute_response, scripts_painless_execute1_response]),
};
