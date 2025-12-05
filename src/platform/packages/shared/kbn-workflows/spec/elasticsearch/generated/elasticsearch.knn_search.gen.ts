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
export const KNN_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.knn_search',
  summary: null,
  description: `Run a knn search.

NOTE: The kNN search API has been replaced by the \`knn\` option in the search API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-knn-search`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_knn_search'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-knn-search',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
