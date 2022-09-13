/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScenarioDescriptor } from '../../cli/scenario';
import { ApmFields } from '../../dsl/apm/apm_fields';
import { BaseApmSignal } from '../../dsl/apm/base_apm_signal';
import { ServiceMetricsAggregator } from './aggregators/service_metrics_aggregator';
import { getBreakdownMetrics } from './processors/get_breakdown_metrics';
import { getSpanDestinationMetrics } from './processors/get_span_destination_metrics';
import { getTransactionMetrics } from './processors/get_transaction_metrics';

export const ApmScenarioDefaults: Omit<ScenarioDescriptor<ApmFields>, 'generate' | 'mapToIndex'> = {
  writeTargets: BaseApmSignal.WriteTargets,
  processors: [getTransactionMetrics, getSpanDestinationMetrics, getBreakdownMetrics],
  streamAggregators: [new ServiceMetricsAggregator()],
};
