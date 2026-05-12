/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { environmentRt, latencyAggregationTypeRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, transactionDataSourceRt } from '../../default_api_types';

export interface MergedServiceTransactionGroupsResponse {
  transactionGroups: Array<{
    alertsCount: number;
    name: string;
    transactionType?: string;
    latency?: number | null;
    throughput?: number;
    errorRate?: number;
    impact?: number;
  }>;
  maxCountExceeded: boolean;
  transactionOverflowCount: number;
  hasActiveAlerts: boolean;
}

export const transactionGroupsMainStatisticsRoute =
  defineRoute<MergedServiceTransactionGroupsResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([
        t.partial({ searchQuery: t.string }),
        environmentRt,
        rangeRt,
        t.type({
          kuery: t.string,
          useDurationSummary: toBooleanRt,
          transactionType: t.string,
          latencyAggregationType: latencyAggregationTypeRt,
        }),
        transactionDataSourceRt,
      ]),
    }),
  });
