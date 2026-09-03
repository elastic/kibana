/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * OVERRIDE FILE
 *
 * Source: elasticsearch-specification repository, operation: esql-query.
 * This override exposes ES|QL approximation, which is absent from the generated snapshot.
 */

import { z } from '@kbn/zod/v4';

import { getShapeAt } from '../../../common/utils/zod';
import type { InternalConnectorContract } from '../../../types/latest';
import { ESQL_QUERY_CONTRACT as GENERATED_ESQL_QUERY_CONTRACT } from '../generated/elasticsearch.esql_query.gen';
import { esql_query_request } from '../generated/schemas/es_openapi_zod.gen';

const approximationSchema = z.union([
  z.boolean(),
  z.object({
    rows: z.optional(z.number().int().min(10_000)),
    confidence_level: z.optional(z.number().min(0).max(1)),
  }),
]);

export const ESQL_QUERY_CONTRACT: InternalConnectorContract = {
  ...GENERATED_ESQL_QUERY_CONTRACT,
  parameterTypes: {
    ...GENERATED_ESQL_QUERY_CONTRACT.parameterTypes,
    bodyParams: [
      ...(GENERATED_ESQL_QUERY_CONTRACT.parameterTypes?.bodyParams ?? []),
      'approximation',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_query_request, 'body'),
    approximation: z.optional(approximationSchema),
    ...getShapeAt(esql_query_request, 'path'),
    ...getShapeAt(esql_query_request, 'query'),
  }),
};
