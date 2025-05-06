/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough, pipeline, Readable } from 'stream';
import { getDedotTransform } from './get_dedot_transform';
import { getSerializeTransform } from '../../../shared/get_serialize_transform';
import { createTransactionMetricsAggregator } from '../../aggregators/otel/create_transaction_metrics_aggregator';
import { createServiceMetricsAggregator } from '../../aggregators/otel/create_service_metrics_aggregator';
import { createServiceSummaryMetricsAggregator } from '../../aggregators/otel/create_service_summary_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../aggregators/otel/create_span_metrics_aggregator';
import { fork } from '../../../utils/stream_utils';
import { getDynamicTemplateTransform } from './get_dynamic_template_transform';
import { getRoutingTransform } from './get_routing_transform';

export function otelPipeline(includeSerialization: boolean = true) {
  const aggregators = [
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

  const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];
  return (base: Readable) => {
    return pipeline(
      // @ts-expect-error see apm_pipeline.ts
      base,
      ...serializationTransform,
      fork(new PassThrough({ objectMode: true }), ...aggregators),
      getRoutingTransform(),
      getDynamicTemplateTransform(),
      getDedotTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
