/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import { PassThrough, pipeline } from 'stream';
import type { Logger } from '../../../../utils/create_logger';
import { getSerializeTransform } from '../../../../shared/get_serialize_transform';
import { getOtelDedotTransform } from './get_otel_dedot_transform';
import { createTransactionMetricsAggregator } from '../../../aggregators/otel/create_transaction_metrics_aggregator';
import { createServiceMetricsAggregator } from '../../../aggregators/otel/create_service_metrics_aggregator';
import { createServiceSummaryMetricsAggregator } from '../../../aggregators/otel/create_service_summary_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../../aggregators/otel/create_span_metrics_aggregator';
import { fork } from '../../../../utils/stream_utils';
import { getOtelDynamicTemplateTransform } from './get_otel_dynamic_template_transform';
import { getOtelRoutingTransform } from './get_otel_routing_transform';
import { getOtelToApmTransform } from './get_otel_to_apm_span_transform';

export function getOtelTransforms() {
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

  return [
    fork(new PassThrough({ objectMode: true }), ...aggregators),
    getOtelRoutingTransform(),
    getOtelDynamicTemplateTransform(),
    getOtelDedotTransform(),
  ];
}
export function otelToApmPipeline(logger: Logger, includeSerialization: boolean = true) {
  return (base: Readable) => {
    const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];

    return pipeline(
      base,
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      ...serializationTransform,
      getOtelToApmTransform(),
      ...getOtelTransforms(),
      (err) => {
        if (err) {
          logger.error(err);
        }
      }
    );
  };
}
