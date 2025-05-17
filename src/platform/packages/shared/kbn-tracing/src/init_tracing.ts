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
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  NodeTracerProvider,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { TracingConfig } from '@kbn/telemetry-config';
import { AgentConfigOptions } from 'elastic-apm-node';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { LateBindingSpanProcessor } from '..';

export function initTracing({
  tracingConfig,
  apmConfig,
}: {
  tracingConfig?: TracingConfig;
  apmConfig: AgentConfigOptions;
}) {
  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  // this is used for late-binding of span processors
  const processor = LateBindingSpanProcessor.get();

  const traceIdSampler = new TraceIdRatioBasedSampler(tracingConfig?.sample_rate ?? 1);

  const nodeTracerProvider = new NodeTracerProvider({
    // by default, base sampling on parent context,
    // or for root spans, based on the configured sample rate
    sampler: new ParentBasedSampler({
      root: traceIdSampler,
    }),
    spanProcessors: [processor],
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: apmConfig.serviceName,
      [ATTR_SERVICE_VERSION]: apmConfig.serviceVersion,
    }),
  });

  trace.setGlobalTracerProvider(nodeTracerProvider);

  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    })
  );

  return async () => {
    // allow for programmatic shutdown
    await processor.shutdown();
  };
}
