/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { latencyOverallTransactionDistributionRoute } from './overall_transaction_distribution';
import { latencyOverallSpanDistributionRoute } from './overall_span_distribution';

export const latencyDistributionRouteDefinitions = {
  overallTransactionDistribution: latencyOverallTransactionDistributionRoute,
  overallSpanDistribution: latencyOverallSpanDistributionRoute,
};

export type { LatencyOverallTransactionDistributionResponse } from './overall_transaction_distribution';
export type { LatencyOverallSpanDistributionResponse } from './overall_span_distribution';
