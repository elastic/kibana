/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';
import { getOtelDedotTransform } from './get_otel_dedot_transform';
import { createTransactionMetricsAggregator } from '../../../aggregators/otel/create_transaction_metrics_aggregator';
import { createServiceMetricsAggregator } from '../../../aggregators/otel/create_service_metrics_aggregator';
import { createServiceSummaryMetricsAggregator } from '../../../aggregators/otel/create_service_summary_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../../aggregators/otel/create_span_metrics_aggregator';
import { fork } from '../../../../utils/stream_utils';
import { getOtelDynamicTemplateTransform } from './get_otel_dynamic_template_transform';
import { getOtelRoutingTransform } from './get_otel_routing_transform';
import { getApmSpanTransform } from './get_apm_span_transform';

export function getOtelMetricsAggregators() {
  return [
    createTransactionMetricsAggregator('1m'),
    createSpanMetricsAggregator('1m'),
    createTransactionMetricsAggregator('10m'),
    createTransactionMetricsAggregator('60m'),
    createServiceMetricsAggregator('1m'),
    createServiceMetricsAggregator('10m'),
    createServiceMetricsAggregator('60m'),
    createServiceSummaryMetricsAggregator('1m'),
    createServiceSummaryMetricsAggregator('10m'),
    createServiceSummaryMetricsAggregator('60m'),
    createSpanMetricsAggregator('10m'),
    createSpanMetricsAggregator('60m'),
  ];
}

export function getOtelPipeline() {
  return [
    getApmSpanTransform(),
    fork(new PassThrough({ objectMode: true }), ...getOtelMetricsAggregators()),
    getOtelRoutingTransform(),
    getOtelDynamicTemplateTransform(),
    getOtelDedotTransform(),
  ];
}
