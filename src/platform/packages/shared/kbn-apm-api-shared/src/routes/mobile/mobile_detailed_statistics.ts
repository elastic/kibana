/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { jsonRt } from '@kbn/io-ts-utils';
import { environmentRt, type Coordinate } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface MobileDetailedStatistics {
  fieldName: string;
  latency: Coordinate[];
  throughput: Coordinate[];
}

export interface MobileDetailedStatisticsResponse {
  currentPeriod: Record<string, MobileDetailedStatistics>;
  previousPeriod: Record<string, MobileDetailedStatistics>;
}

export const mobileDetailedStatisticsRoute = defineRoute<MobileDetailedStatisticsResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      offsetRt,
      environmentRt,
      t.type({
        field: t.string,
        fieldValues: jsonRt.pipe(t.array(t.string)),
      }),
    ]),
  }),
});
