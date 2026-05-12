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
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
import { environmentRt, latencyDistributionChartTypeRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type LatencyOverallTransactionDistributionResponse = OverallLatencyDistributionResponse;

export const latencyOverallTransactionDistributionRoute =
  defineRoute<LatencyOverallTransactionDistributionResponse>()({
    endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
    params: t.type({
      body: t.intersection([
        t.partial({
          serviceName: t.string,
          transactionName: t.string,
          transactionType: t.string,
          termFilters: t.array(
            t.type({
              fieldName: t.string,
              fieldValue: t.union([t.string, toNumberRt]),
            })
          ),
          durationMin: toNumberRt,
          durationMax: toNumberRt,
        }),
        environmentRt,
        kueryRt,
        rangeRt,
        t.type({
          percentileThreshold: toNumberRt,
          chartType: latencyDistributionChartTypeRt,
        }),
      ]),
    }),
  });
