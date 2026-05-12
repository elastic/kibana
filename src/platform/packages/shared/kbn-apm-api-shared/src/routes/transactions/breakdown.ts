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
import { kueryRt, rangeRt } from '../../default_api_types';

export interface TransactionBreakdownResponse {
  timeseries: Array<{
    title: string;
    type: string;
    data: Coordinate[];
    hideLegend: boolean;
    legendValue: any;
  }>;
}

export const transactionChartsBreakdownRoute = defineRoute<TransactionBreakdownResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
});
