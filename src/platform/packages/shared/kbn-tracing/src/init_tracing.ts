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
import type { InferenceTracingAgentBuilderExportConfig } from '@kbn/inference-tracing-config';
import {
  InferencePreservingSampler,
  AgentBuilderSpanProcessor,
  ElasticsearchOtlpExporter,
  EVAL_RUN_ID_BAGGAGE_KEY,
  LangfuseSpanProcessor,
  PhoenixSpanProcessor,
} from '@kbn/inference-tracing';
import type { ElasticsearchTransport } from '@kbn/inference-tracing';
import { fromExternalVariant } from '@kbn/std';
import type { TracingConfig } from '@kbn/tracing-config';
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { castArray } from 'lodash';
import { cleanupBeforeExit } from '@kbn/cleanup-before-exit';
import { EvalSpanProcessor } from './eval_span_processor';
import { OTLPSpanProcessor } from './otlp_span_processor';
import { LateBindingSpanProcessor } from '..';

let pendingSendToSelfConfig: InferenceTracingAgentBuilderExportConfig | undefined;

/**
 * If a `send_to_self` agent_builder exporter was configured, this function
 * completes the deferred registration by wiring the exporter to the
 * provided Elasticsearch client. Safe to call multiple times — only the
 * first call with a pending config takes effect.
 *
 * @returns A teardown function, or `undefined` if nothing was registered.
 */
export function completeSendToSelfRegistration(
  esClient: ElasticsearchTransport,
  options?: { isEnabled?: () => boolean }
): (() => Promise<void>) | undefined {
  const config = pendingSendToSelfConfig;
  if (!config) {
    return undefined;
  }
  pendingSendToSelfConfig = undefined;

  const exporter = new ElasticsearchOtlpExporter(esClient);
  const processor = new AgentBuilderSpanProcessor({
    exporter,
    scheduledDelayMillis: config.scheduled_delay,
    isEnabled: options?.isEnabled,
    forceSample: config.force_sample,
  });

  return LateBindingSpanProcessor.get().register(processor);
}

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

  lateBindingProcessor.register(new EvalSpanProcessor([{ baggageKey: EVAL_RUN_ID_BAGGAGE_KEY }]));

  const allSpanProcessors: tracing.SpanProcessor[] = [lateBindingProcessor];

  propagation.setGlobalPropagator(
    new core.CompositePropagator({
      propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
    })
  );

  const traceIdSampler = new tracing.TraceIdRatioBasedSampler(tracingConfig.sample_rate);

  const baseSampler = new tracing.ParentBasedSampler({
    root: traceIdSampler,
  });

  const nodeTracerProvider = new node.NodeTracerProvider({
    sampler: new InferencePreservingSampler(baseSampler),
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

      case 'agent_builder':
        if (variant.value.send_to_self) {
          pendingSendToSelfConfig = variant.value;
        } else {
          LateBindingSpanProcessor.get().register(new AgentBuilderSpanProcessor(variant.value));
        }
        break;
    }
  });

  trace.setGlobalTracerProvider(nodeTracerProvider);

  const shutdown = async () => {
    await Promise.all(allSpanProcessors.map((processor) => processor.shutdown()));
  };

  cleanupBeforeExit(() => shutdown(), { blockExit: true, timeout: 30_000 });
}
