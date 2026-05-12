/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';
import { dependencyChartQueryRt } from './types';

export interface ThroughputChartsForDependencyResponse {
  currentTimeseries: Array<{ x: number; y: number | null }>;
  comparisonTimeseries: Array<{ x: number; y: number | null }> | null;
}

export const dependencyThroughputChartsRoute =
  defineRoute<ThroughputChartsForDependencyResponse>()({
    endpoint: 'GET /internal/apm/dependencies/charts/throughput',
    params: t.type({ query: dependencyChartQueryRt }),
  });
