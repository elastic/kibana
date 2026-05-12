/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt, type Coordinate } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface ColdstartRateResponse {
  currentPeriod: {
    transactionColdstartRate: Coordinate[];
    average: number | null;
  };
  previousPeriod: {
    transactionColdstartRate: Coordinate[];
    average: number | null;
  };
}

export const transactionChartsColdstartRateRoute = defineRoute<ColdstartRateResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
    ]),
  }),
});
