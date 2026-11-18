/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { TelemetryConfiguration } from '@kbn/apm-config-loader';
import { initTracing } from '@kbn/tracing';
import { initMetrics } from '@kbn/metrics';
import type { InitMetricsOptions } from '@kbn/metrics';
import { context } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { Resource } from '@opentelemetry/resources';
import { maybeInitAutoInstrumentations } from './init_autoinstrumentations';

export interface TelemetryLifecycle {
  ready: Promise<void>;
  forceFlush: () => Promise<void>;
  shutdown: () => Promise<void>;
}

/** Initializes the native telemetry providers from resolved settings and a native resource. */
export const initTelemetryFromConfiguration = (
  configuration: Pick<TelemetryConfiguration, 'apm' | 'telemetry' | 'monitoringCollection'>,
  createResource: () => Resource,
  metricsOptions: Pick<InitMetricsOptions, 'prometheusReader' | 'additionalReaders'> = {}
): TelemetryLifecycle => {
  const {
    apm: apmConfig,
    telemetry: telemetryConfig,
    monitoringCollection: monitoringCollectionConfig,
  } = configuration;
  if (apmConfig.active !== false && telemetryConfig.tracing.enabled) {
    throw new Error(
      'Elastic APM and OpenTelemetry tracing cannot be enabled simultaneously.\n' +
        'To use OpenTelemetry tracing, disable APM by setting `elastic.apm.active: false` in your Kibana configuration.\n' +
        'To use Elastic APM, disable OpenTelemetry tracing by setting `telemetry.tracing.enabled: false`.'
    );
  }
  const resource = createResource();
  // Inference needs active context and baggage even when global telemetry export is disabled.
  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  let metrics: Awaited<ReturnType<typeof initMetrics>> | undefined;
  let tracing: ReturnType<typeof initTracing> | undefined;
  if (telemetryConfig.enabled && telemetryConfig.tracing.enabled) {
    maybeInitAutoInstrumentations();
  }
  // `initMetrics` is now async (it only imports the one configured OTLP exporter variant, not all
  // three), so metrics setup moves into the same deferred `ready` step tracing already uses,
  // rather than running synchronously before `ready` resolves. A caller that reads from the
  // global meter provider before awaiting `ready` gets the no-op provider, exactly as it already
  // would for tracing.
  const ready = Promise.resolve(resource.waitForAsyncAttributes?.()).then(async () => {
    if (telemetryConfig.enabled) {
      if (telemetryConfig.tracing.enabled) {
        tracing = initTracing({ resource, tracingConfig: telemetryConfig.tracing });
      }
      if (telemetryConfig.metrics.enabled || monitoringCollectionConfig.enabled) {
        metrics = await initMetrics({
          ...metricsOptions,
          resource,
          metricsConfig: telemetryConfig.metrics,
          monitoringCollectionConfig,
        });
      }
    }
  });
  return {
    ready,
    forceFlush: async () => {
      await ready;
      await Promise.all([metrics?.forceFlush(), tracing?.forceFlush()]);
    },
    shutdown: async () => {
      await ready;
      await Promise.all([metrics?.shutdown(), tracing?.shutdown()]);
      contextManager.disable();
    },
  };
};
