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
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export interface DependencyLatencyDistributionResponse {
  allSpansDistribution: OverallLatencyDistributionResponse;
  failedSpansDistribution: OverallLatencyDistributionResponse;
}

export const dependencyLatencyDistributionRoute =
  defineRoute<DependencyLatencyDistributionResponse>()({
    endpoint: 'GET /internal/apm/dependencies/charts/distribution',
    params: t.type({
      query: t.intersection([
        t.type({
          dependencyName: t.string,
          spanName: t.string,
          percentileThreshold: toNumberRt,
        }),
        rangeRt,
        kueryRt,
        environmentRt,
      ]),
    }),
  });
