/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt, latencyAggregationTypeRt, type Coordinate } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kueryRt,
  rangeRt,
  offsetRt,
  filtersRt,
  serviceTransactionDataSourceRt,
} from '../../default_api_types';

export interface TransactionLatencyResponse {
  currentPeriod: {
    overallAvgDuration: number | null;
    latencyTimeseries: Coordinate[];
  };
  previousPeriod: {
    overallAvgDuration: number | null;
    latencyTimeseries: Coordinate[];
  };
}

export const transactionLatencyChartsRoute = defineRoute<TransactionLatencyResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({
        latencyAggregationType: latencyAggregationTypeRt,
        bucketSizeInSeconds: toNumberRt,
        useDurationSummary: toBooleanRt,
      }),
      t.partial({ transactionType: t.string, transactionName: t.string, filters: filtersRt }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
      serviceTransactionDataSourceRt,
    ]),
  }),
});
