/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { resources } from '@elastic/opentelemetry-node/sdk';
import { core, node, tracing } from '@elastic/opentelemetry-node/sdk';
import {
  EVAL_RUN_ID_BAGGAGE_KEY,
  LangfuseSpanProcessor,
  PhoenixSpanProcessor,
} from '@kbn/inference-tracing';
import { fromExternalVariant } from '@kbn/std';
import type { TracingConfig } from '@kbn/tracing-config';
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { castArray } from 'lodash';
import { cleanupBeforeExit } from '@kbn/cleanup-before-exit';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { HapiInstrumentation } from '@opentelemetry/instrumentation-hapi';
import { EvalSpanProcessor } from './eval_span_processor';
import { OTLPSpanProcessor } from './otlp_span_processor';
import { LateBindingSpanProcessor } from '..';

/**
 * Initialize the OpenTelemetry tracing provider
 * @param resource The OpenTelemetry resource information
 * @param tracingConfig The OpenTelemetry tracing configuration
 */
export function initTracing({
  resource,
  tracingConfig,
}: {
  resource: resources.Resource;
  tracingConfig: TracingConfig;
}) {
  /**
   * Auto-instrumentation is intentionally opt-in.
   *
   * It can increase trace volume significantly, and Kibana generally relies on explicit
   * instrumentation for tracing. For evals, enabling this provides request-scoped context
   * propagation (so W3C baggage like `kibana.evals.run_id` can be extracted and attached).
   */
  if (process.env.KBN_OTEL_AUTO_INSTRUMENTATIONS === 'true') {
    // Register OpenTelemetry auto-instrumentations once per process.
    // NOTE: these instrumentations must not be enabled alongside Elastic APM.
    const INSTRUMENTATIONS_REGISTERED = Symbol.for('kbn.tracing.instrumentations_registered');
    if (!(globalThis as any)[INSTRUMENTATIONS_REGISTERED]) {
      (globalThis as any)[INSTRUMENTATIONS_REGISTERED] = true;
      registerInstrumentations({
        instrumentations: [
          // Kibana runs on Hapi. This instrumentation gives us higher-level request spans
          // and ensures context propagation for request-scoped correlation (like eval run ids).
          new HapiInstrumentation(),
          // Create incoming HTTP server spans and extract trace context + baggage.
          new HttpInstrumentation({
            // Only create outgoing spans when there is an active parent span.
            // This keeps noise down and ensures spans remain connected to request traces.
            requireParentforOutgoingSpans: true,
          }),
          // undici is used by Elasticsearch client; require a parent so we don't create a new trace per request.
          new UndiciInstrumentation({
            requireParentforSpans: true,
          }),
        ],
      });
    }
  }

  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  // this is used for late-binding of span processors
  const lateBindingProcessor = LateBindingSpanProcessor.get();

  lateBindingProcessor.register(new EvalSpanProcessor([{ baggageKey: EVAL_RUN_ID_BAGGAGE_KEY }]));

  const allSpanProcessors: tracing.SpanProcessor[] = [lateBindingProcessor];

  propagation.setGlobalPropagator(
    new core.CompositePropagator({
      propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
    })
  );

  const traceIdSampler = new tracing.TraceIdRatioBasedSampler(tracingConfig.sample_rate);

  const nodeTracerProvider = new node.NodeTracerProvider({
    // by default, base sampling on parent context,
    // or for root spans, based on the configured sample rate
    sampler: new tracing.ParentBasedSampler({
      root: traceIdSampler,
    }),
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

      case 'http':
        LateBindingSpanProcessor.get().register(new OTLPSpanProcessor(variant.value, 'http'));
        break;
    }
  });

  trace.setGlobalTracerProvider(nodeTracerProvider);

  propagation.setGlobalPropagator(
    new core.CompositePropagator({
      propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
    })
  );

  const shutdown = async () => {
    await Promise.all(allSpanProcessors.map((processor) => processor.shutdown()));
  };

  cleanupBeforeExit(() => shutdown(), { blockExit: true, timeout: 30_000 });
}
