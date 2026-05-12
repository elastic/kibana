/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt, type MobilePropertyType } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type MobileMostUsedChartResponse = Array<{
  key: MobilePropertyType;
  options: Array<{
    key: string | number;
    docCount: number;
  }>;
}>;

export interface MobileMostUsedChartsRouteResponse {
  mostUsedCharts: Array<{
    key: MobilePropertyType;
    options: MobileMostUsedChartResponse[number]['options'];
  }>;
}

export const mobileMostUsedChartsRoute = defineRoute<MobileMostUsedChartsRouteResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/most_used_charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.partial({
        transactionType: t.string,
      }),
    ]),
  }),
});
