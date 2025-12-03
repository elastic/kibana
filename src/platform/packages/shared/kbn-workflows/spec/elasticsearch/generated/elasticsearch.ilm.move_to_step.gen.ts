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
 * Source: elasticsearch-specification repository, operations: ilm-move-to-step
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_move_to_step_request, ilm_move_to_step_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_MOVE_TO_STEP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.move_to_step',
  summary: `Move to a lifecycle step`,
  description: `Move to a lifecycle step.

Manually move an index into a specific step in the lifecycle policy and run that step.

WARNING: This operation can result in the loss of data. Manually moving an index into a specific step runs that step even if it has already been performed. This is a potentially destructive action and this should be considered an expert level API.

You must specify both the current step and the step to be executed in the body of the request.
The request will fail if the current step does not match the step currently running for the index
This is to prevent the index from being moved from an unexpected step into the next step.

When specifying the target (\`next_step\`) to which the index will be moved, either the name or both the action and name fields are optional.
If only the phase is specified, the index will move to the first step of the first action in the target phase.
If the phase and action are specified, the index will move to the first step of the specified action in the specified phase.
Only actions specified in the ILM policy are considered valid.
An index cannot move to a step that is not part of its policy.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-move-to-step`,
  methods: ['POST'],
  patterns: ['_ilm/move/{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-move-to-step',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: ['current_step', 'next_step'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_move_to_step_request, 'body'),
    ...getShapeAt(ilm_move_to_step_request, 'path'),
    ...getShapeAt(ilm_move_to_step_request, 'query'),
  }),
  outputSchema: ilm_move_to_step_response,
};
