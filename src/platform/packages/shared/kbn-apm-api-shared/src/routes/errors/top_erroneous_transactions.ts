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
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface TopErroneousTransactionsResponse {
  topErroneousTransactions: Array<{
    transactionName: string;
    currentPeriodTimeseries: Array<{ x: number; y: number }>;
    previousPeriodTimeseries: Array<{ x: number; y: number }>;
    transactionType: string | undefined;
    occurrences: number;
  }>;
}

export const topErroneousTransactionsRoute = defineRoute<TopErroneousTransactionsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions',
  params: t.type({
    path: t.type({ serviceName: t.string, groupId: t.string }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
      t.type({ numBuckets: toNumberRt }),
    ]),
  }),
});
