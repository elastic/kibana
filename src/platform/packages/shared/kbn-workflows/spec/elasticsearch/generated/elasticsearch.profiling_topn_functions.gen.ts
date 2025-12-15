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
 * Source: elasticsearch-specification repository, operations:
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const PROFILING_TOPN_FUNCTIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.profiling.topn_functions',
  summary: null,
  description: `Extracts a list of topN functions from Universal Profiling.

 Documentation: https://www.elastic.co/guide/en/observability/current/universal-profiling.html`,
  methods: ['POST'],
  patterns: ['_profiling/topn/functions'],
  documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
