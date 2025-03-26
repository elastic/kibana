/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation, ApmOtelFields } from '@kbn/apm-synthtrace-client';
import { PassThrough, pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../../../shared/base_client';
import { getDedotTransform } from './get_dedot_transform';
import { getSerializeTransform } from '../../../shared/get_serialize_transform';
import { Logger } from '../../../utils/create_logger';
import { createTransactionMetricsAggregator } from '../../aggregators/otel/create_transaction_metrics_aggregator';
import { createServiceMetricsAggregator } from '../../aggregators/otel/create_service_metrics_aggregator';
import { createServiceSummaryMetricsAggregator } from '../../aggregators/otel/create_service_summary_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../aggregators/otel/create_span_metrics_aggregator';
import { fork } from '../../../utils/stream_utils';

export type OtelSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class OtelSynthtraceEsClient extends SynthtraceEsClient<ApmOtelFields> {
  constructor(options: { client: Client; logger: Logger } & OtelSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: otelPipeline(),
    });
    this.dataStreams = ['metrics-*.otel*', 'traces-*.otel*', 'logs-*.otel*'];
  }

  getDefaultPipeline(
    {
      includeSerialization,
    }: {
      includeSerialization?: boolean;
    } = { includeSerialization: true }
  ) {
    return otelPipeline(includeSerialization);
  }
}

function otelPipeline(includeSerialization: boolean = true) {
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
      getDedotTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}

export function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<ApmOtelFields>, encoding, callback) {
      const namespace = 'default';
      let index: string | undefined;

      switch (document['attributes.processor.event']) {
        case 'transaction':
        case 'span':
          index = `traces-generic.otel-${namespace}`;
          break;

        case 'error':
          index = `logs-generic.otel-${namespace}`;
          break;

        case 'metric':
          const metricsetName = document['attributes.metricset.name'];
          const metricsetInterval = document['attributes.metricset.interval'];
          if (
            metricsetName === 'transaction' ||
            metricsetName === 'service_transaction' ||
            metricsetName === 'service_destination' ||
            metricsetName === 'service_summary'
          ) {
            index = `metrics-${metricsetName}.${metricsetInterval}.otel-${namespace}`;
          } else {
            index = `metrics.otel-internal-${namespace}`;
          }
          break;
        default:
          break;
      }

      if (!index) {
        const error = new Error('Cannot determine index for event');
        Object.assign(error, { document });
      }

      document._index = index;

      callback(null, document);
    },
  });
}
