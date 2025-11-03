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
import { LangfuseSpanProcessor, PhoenixSpanProcessor } from '@kbn/inference-tracing';
import { fromExternalVariant } from '@kbn/std';
import type { TracingConfig } from '@kbn/tracing-config';
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { castArray } from 'lodash';
import { cleanupBeforeExit } from '@kbn/cleanup-before-exit';
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
  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  // this is used for late-binding of span processors
  const lateBindingProcessor = LateBindingSpanProcessor.get();

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
