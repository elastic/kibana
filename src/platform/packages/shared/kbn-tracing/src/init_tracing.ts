/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import {
  NodeTracerProvider,
  ParentBasedSampler,
  SpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import { TracingConfig } from '@kbn/tracing-config';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { castArray, once } from 'lodash';
import { fromExternalVariant } from '@kbn/std';
import { LangfuseSpanProcessor, PhoenixSpanProcessor } from '@kbn/inference-tracing';
import { metricsApi } from '@kbn/metrics';
import {
  ATTR_SPAN_SUBTYPE,
  ATTR_SPAN_TYPE,
  ATTR_TRANSACTION_NAME,
  ATTR_TRANSACTION_TYPE,
  METRIC_SPAN_SELF_TIME_SUM_US,
} from '@kbn/opentelemetry-attributes';
import { AgentConfigOptions } from '@kbn/telemetry-config';
import { LateBindingSpanProcessor } from '..';
import { TracingApi } from './types';
import { ContextTrackingProcessor } from './context_tracking_processor';
import { createElasticApmApi } from './bridge/elastic_apm_api';
import { BreakdownMetricsSpanProcessor } from './breakdown_metrics/breakdown_metrics_span_processor';

export let tracingApi: TracingApi | undefined;

export function initTracing({
  tracingConfig,
  apmConfig,
  resource,
}: {
  tracingConfig?: TracingConfig;
  apmConfig?: AgentConfigOptions;
  resource: Resource;
}) {
  if (tracingApi) {
    // don't allow multiple bootstraps as behaviour is undefined
    throw new Error('initTracing() called multiple times - can only be called once');
  }

  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  // this is used for late-binding of span processors
  const lateBindingProcessor = LateBindingSpanProcessor.get();
  const contextTrackingProcessor = new ContextTrackingProcessor();

  const allSpanProcessors: SpanProcessor[] = [contextTrackingProcessor, lateBindingProcessor];

  if (apmConfig?.breakdownMetrics && metricsApi) {
    allSpanProcessors.push(
      new BreakdownMetricsSpanProcessor({
        histogram: metricsApi.getDefaultMeter().createHistogram(METRIC_SPAN_SELF_TIME_SUM_US),
        limit: apmConfig.metricsLimit ?? 1000,
        dimensions: [
          ATTR_TRANSACTION_NAME,
          ATTR_TRANSACTION_TYPE,
          ATTR_SPAN_TYPE,
          ATTR_SPAN_SUBTYPE,
        ],
      })
    );
  }

  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    })
  );

  const traceIdSampler = new TraceIdRatioBasedSampler(tracingConfig?.sample_rate ?? 1);

  const nodeTracerProvider = new NodeTracerProvider({
    // by default, base sampling on parent context,
    // or for root spans, based on the configured sample rate
    sampler: new ParentBasedSampler({
      root: traceIdSampler,
    }),
    spanProcessors: allSpanProcessors,
    resource,
  });

  const defaultTracer = nodeTracerProvider.getTracer('kibana');

  tracingApi = {
    legacy: createElasticApmApi({
      tracer: defaultTracer,
      getElasticTracingContext: () => {
        return contextTrackingProcessor.getElasticTracingContext();
      },
    }),
    async forceFlush() {
      await Promise.all(allSpanProcessors.map((processor) => processor.forceFlush()));
    },
    getDefaultTracer: () => defaultTracer,
  };

  castArray(tracingConfig?.exporters ?? []).forEach((exporter) => {
    const variant = fromExternalVariant(exporter);
    switch (variant.type) {
      case 'langfuse':
        LateBindingSpanProcessor.get().register(new LangfuseSpanProcessor(variant.value));
        break;

      case 'phoenix':
        LateBindingSpanProcessor.get().register(new PhoenixSpanProcessor(variant.value));
        break;
    }
  });

  trace.setGlobalTracerProvider(nodeTracerProvider);

  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    })
  );

  const shutdown = once(async () => {
    await Promise.all(allSpanProcessors.map((processor) => processor.shutdown()));
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('beforeExit', shutdown);
}
