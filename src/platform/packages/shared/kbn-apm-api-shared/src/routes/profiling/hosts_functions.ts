/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt, serviceTransactionDataSourceRt } from '../../default_api_types';

export interface ProfilingHostsFunctionsResponse {
  functions: TopNFunctions;
  hostNames: string[];
  containerIds: string[];
}

export const profilingHostsFunctionsRoute = defineRoute<ProfilingHostsFunctionsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/hosts/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      serviceTransactionDataSourceRt,
      t.type({ startIndex: toNumberRt, endIndex: toNumberRt }),
      kueryRt,
    ]),
  }),
});
