/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

interface MobileStatsTimeseries {
  x: number;
  y: number;
}

interface MobileStats {
  sessions: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
  requests: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
  crashRate: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
  launchTimes: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
}

export interface MobilePeriodStats {
  currentPeriod: MobileStats;
  previousPeriod: MobileStats;
}

export const mobileStatsRoute = defineRoute<MobilePeriodStats>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/stats',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      offsetRt,
      t.partial({
        transactionType: t.string,
      }),
    ]),
  }),
});
