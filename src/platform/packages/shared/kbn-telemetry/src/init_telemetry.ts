/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { loadConfiguration } from '@kbn/apm-config-loader';
import { LateBindingSpanProcessor } from '@kbn/tracing';
import { context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  NodeTracerProvider,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/**
 *
 * Initializes OpenTelemetry (currently only tracing)
 *
 * @param argv                Process arguments
 * @param rootDir             Root dir of Kibana repo
 * @param isDistributable     Whether this is a distributable build
 * @param serviceName         The service name used in resource attributes
 * @returns                   A function that can be called on shutdown and allows exporters to flush their queue.
 */
export const initTelemetry = (
  argv: string[],
  rootDir: string,
  isDistributable: boolean,
  serviceName: string
) => {
  const apmConfigLoader = loadConfiguration(argv, rootDir, isDistributable);

  const apmConfig = apmConfigLoader.getConfig(serviceName);

  const telemetryConfig = apmConfigLoader.getTelemetryConfig();

  // explicitly check for enabled == false, as the default in the schema
  // is true, but it's not parsed through @kbn/config-schema, so the
  // default value is not returned
  const telemetryEnabled = telemetryConfig?.enabled !== false;

  // tracing is enabled only when telemetry is enabled and tracing is not disabled
  const tracingEnabled = telemetryEnabled && telemetryConfig?.tracing?.enabled;

  if (!tracingEnabled) {
    return async () => {};
  }

  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  // this is used for late-binding of span processors
  const processor = LateBindingSpanProcessor.get();

  const nodeTracerProvider = new NodeTracerProvider({
    // by default, base sampling on parent context,
    // or for root spans, based on the configured sample rate
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(telemetryConfig.tracing?.sample_rate),
    }),
    spanProcessors: [processor],
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: apmConfig.serviceName,
      [ATTR_SERVICE_VERSION]: apmConfig.serviceVersion,
    }),
  });

  trace.setGlobalTracerProvider(nodeTracerProvider);

  return async () => {
    // allow for programmatic shutdown
    await processor.shutdown();
  };
};
