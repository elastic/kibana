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
 * Generated at: 2025-11-27T07:04:28.211Z
 * Source: elasticsearch-specification repository, operations: ilm-explain-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ilm_explain_lifecycle_request,
  ilm_explain_lifecycle_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_EXPLAIN_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.explain_lifecycle',
  connectorGroup: 'internal',
  summary: `Explain the lifecycle state`,
  description: `Explain the lifecycle state.

Get the current lifecycle status for one or more indices.
For data streams, the API retrieves the current lifecycle status for the stream's backing indices.

The response indicates when the index entered each lifecycle state, provides the definition of the running phase, and information about any failures.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-explain-lifecycle`,
  methods: ['GET'],
  patterns: ['{index}/_ilm/explain'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-explain-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['only_errors', 'only_managed', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_explain_lifecycle_request, 'body'),
    ...getShapeAt(ilm_explain_lifecycle_request, 'path'),
    ...getShapeAt(ilm_explain_lifecycle_request, 'query'),
  }),
  outputSchema: ilm_explain_lifecycle_response,
};
