/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EXECUTION_ID_BAGGAGE_KEY,
  EVAL_EXPERIMENT_ID_BAGGAGE_KEY,
  LangfuseSpanProcessor,
  PhoenixSpanProcessor,
} from '@kbn/inference-tracing';
import { fromExternalVariant } from '@kbn/std';
import type { TracingConfig } from '@kbn/tracing-config';
import { propagation, trace } from '@opentelemetry/api';
import { castArray } from 'lodash';
import { cleanupBeforeExit } from '@kbn/cleanup-before-exit';
import type { Resource } from '@opentelemetry/resources';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import type { SpanProcessor } from '@opentelemetry/sdk-trace';
import { LateBindingSpanProcessor } from '..';
import { OTLPSpanProcessor } from './otlp_span_processor';
import { EvalSpanProcessor } from './eval_span_processor';

/**
 * Initialize the OpenTelemetry tracing provider
 * @param resource The OpenTelemetry resource information
 * @param tracingConfig The OpenTelemetry tracing configuration
 */
export function initTracing({
  resource,
  tracingConfig,
}: {
  resource: Resource;
  tracingConfig: TracingConfig;
}) {
  // this is used for late-binding of span processors
  const lateBindingProcessor = LateBindingSpanProcessor.get();

  lateBindingProcessor.register(
    new EvalSpanProcessor([
      { baggageKey: EXECUTION_ID_BAGGAGE_KEY },
      { baggageKey: EVAL_EXPERIMENT_ID_BAGGAGE_KEY },
    ])
  );

  const allSpanProcessors: SpanProcessor[] = [lateBindingProcessor];

  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    })
  );

  const traceIdSampler = new TraceIdRatioBasedSampler(tracingConfig.sample_rate);

  const baseSampler = new ParentBasedSampler({
    root: traceIdSampler,
  });

  const nodeTracerProvider = new TracerProvider({
    sampler: baseSampler,
    spanProcessors: allSpanProcessors,
    resource,
  });

  castArray(tracingConfig.exporters).forEach((exporter) => {
    const variant = fromExternalVariant(exporter);
    switch (variant.type) {
      case 'langfuse':
        LateBindingSpanProcessor.get().register(new LangfuseSpanProcessor(variant.value));
        break;

      case 'phoenix':
        LateBindingSpanProcessor.get().register(new PhoenixSpanProcessor(variant.value));
        break;

      case 'grpc':
        LateBindingSpanProcessor.get().register(new OTLPSpanProcessor(variant.value, 'grpc'));
        break;

      case 'proto':
        LateBindingSpanProcessor.get().register(new OTLPSpanProcessor(variant.value, 'proto'));
        break;

      case 'http':
        LateBindingSpanProcessor.get().register(new OTLPSpanProcessor(variant.value, 'http'));
        break;
    }
  });

  trace.setGlobalTracerProvider(nodeTracerProvider);

  const shutdown = async () => {
    await Promise.all(allSpanProcessors.map((processor) => processor.shutdown()));
  };

  cleanupBeforeExit(() => shutdown(), { blockExit: true, timeout: 30_000 });
}
