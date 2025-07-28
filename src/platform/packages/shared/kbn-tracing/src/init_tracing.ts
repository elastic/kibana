/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { core, node, resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { LangfuseSpanProcessor, PhoenixSpanProcessor } from '@kbn/inference-tracing';
import { fromExternalVariant } from '@kbn/std';
import { TracingConfig } from '@kbn/tracing-config';
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { AgentConfigOptions } from 'elastic-apm-node';
import { castArray, once } from 'lodash';
import { ATTR_SERVICE_INSTANCE_ID, ATTR_SERVICE_NAMESPACE } from '@kbn/opentelemetry-attributes';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { LateBindingSpanProcessor } from '..';

export function initTracing({
  tracingConfig,
  apmConfig,
}: {
  tracingConfig?: TracingConfig;
  apmConfig?: AgentConfigOptions;
}) {
  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  const resource = resources.resourceFromAttributes({
    [ATTR_SERVICE_NAME]: apmConfig?.serviceName,
    [ATTR_SERVICE_INSTANCE_ID]: apmConfig?.serviceNodeName,
    [ATTR_SERVICE_NAMESPACE]: apmConfig?.environment,
  });

  // this is used for late-binding of span processors
  const lateBindingProcessor = LateBindingSpanProcessor.get();

  const allSpanProcessors: tracing.SpanProcessor[] = [lateBindingProcessor];

  propagation.setGlobalPropagator(
    new core.CompositePropagator({
      propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
    })
  );

  const traceIdSampler = new tracing.TraceIdRatioBasedSampler(tracingConfig?.sample_rate ?? 1);

  const nodeTracerProvider = new node.NodeTracerProvider({
    // by default, base sampling on parent context,
    // or for root spans, based on the configured sample rate
    sampler: new tracing.ParentBasedSampler({
      root: traceIdSampler,
    }),
    spanProcessors: allSpanProcessors,
    resource,
  });

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
    new core.CompositePropagator({
      propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
    })
  );

  const shutdown = once(async () => {
    await Promise.all(allSpanProcessors.map((processor) => processor.shutdown()));
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('beforeExit', shutdown);
}
