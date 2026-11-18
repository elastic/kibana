/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Resource } from '@opentelemetry/resources';
import { metrics as metricsApi } from '@opentelemetry/api';
import {
  type IMetricReader,
  AggregationTemporality,
  type PushMetricExporter,
  PeriodicExportingMetricReader,
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { castArray } from 'lodash';
import type { MetricsConfig, MonitoringCollectionConfig } from '@kbn/metrics-config';
import { dynamicCjsExport, fromExternalVariant } from '@kbn/std';
import { cleanupBeforeExit } from '@kbn/cleanup-before-exit';
import { duration } from 'moment';
import { PrometheusExporter } from './prometheus_exporter';

/**
 * Options to the initMetrics method
 */
export interface InitMetricsOptions {
  prometheusReader?: IMetricReader;
  additionalReaders?: IMetricReader[];
  /**
   * The OpenTelemetry resource information
   */
  resource: Resource;
  /**
   * The OpenTelemetry metrics configuration
   */
  metricsConfig: MetricsConfig;
  /**
   * The config of the Monitoring Collection plugin
   */
  monitoringCollectionConfig: MonitoringCollectionConfig;
}

/**
 * Initialize the OpenTelemetry meter provider. Only the one OTLP exporter variant a configured
 * exporter actually selects (grpc/http/proto) is imported, so a worker that never configures an
 * exporter (the common case for a task process) never pays for `@grpc/grpc-js` or the other two
 * exporter SDKs it isn't using.
 * @param initMetricsOptions {@link InitMetricsOptions}
 */
export async function initMetrics(initMetricsOptions: InitMetricsOptions): Promise<{
  forceFlush: () => Promise<void>;
  shutdown: () => Promise<void>;
}> {
  const { resource, metricsConfig, monitoringCollectionConfig } = initMetricsOptions;

  const globalExportIntervalMillis = metricsConfig.interval.asMilliseconds();
  const globalExportTimeoutMillis = metricsConfig.timeout?.asMilliseconds();

  const readers: IMetricReader[] = [...(initMetricsOptions.additionalReaders ?? [])];

  // OTel requires all readers to be initialized when initializing the SDK.
  // If the monitoring collection plugin requires the prometheus exporter, we need to initialize it now.
  if (
    monitoringCollectionConfig.enabled &&
    monitoringCollectionConfig.opentelemetry.metrics.prometheus.enabled
  ) {
    readers.push(initMetricsOptions.prometheusReader ?? PrometheusExporter.get());
  }

  const exporters = metricsConfig.enabled ? castArray(metricsConfig.exporters) : [];

  if (monitoringCollectionConfig.enabled) {
    // For BWC reasons, we want to support the OTLP configuration present in the monitoring collection plugin.
    const otlpConfig = monitoringCollectionConfig.opentelemetry.metrics.otlp;

    const {
      url = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers,
      exportIntervalMillis,
    } = otlpConfig;

    if (url) {
      const temporalityPreference =
        (process.env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE as 'cumulative' | 'delta') ??
        'cumulative';

      // We just need to push it as another grpc config
      exporters.push({
        grpc: {
          url,
          headers,
          exportInterval: duration(exportIntervalMillis, 'ms'),
          temporalityPreference,
        },
      });
    }
  }

  readers.push(
    ...(await Promise.all(
      exporters.map(async (exporterConfig) => {
        const variant = fromExternalVariant(exporterConfig);

        const commonConfig = {
          temporalityPreference:
            variant.value.temporalityPreference === 'delta'
              ? AggregationTemporality.DELTA
              : AggregationTemporality.CUMULATIVE,
        };

        let exporter: PushMetricExporter;
        switch (variant.type) {
          case 'grpc': {
            const [grpcJsModule, otlpGrpcModule] = await Promise.all([
              import('@grpc/grpc-js'),
              import('@opentelemetry/exporter-metrics-otlp-grpc'),
            ]);
            // Dynamically imported so a worker that never configures a grpc exporter never pays
            // for `@grpc/grpc-js`; `dynamicCjsExport` is needed because esbuild's code splitting
            // for the task process bundle can drop the named export these CJS packages would
            // otherwise synthesize when reached only through this dynamic import (see its doc).
            const Metadata = dynamicCjsExport<typeof import('@grpc/grpc-js').Metadata>(
              grpcJsModule,
              'Metadata'
            );
            const OTLPMetricExporterGrpc = dynamicCjsExport<
              typeof import('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter
            >(otlpGrpcModule, 'OTLPMetricExporter');
            const metadata = new Metadata();
            Object.entries(variant.value.headers || {}).forEach(([key, value]) => {
              metadata.add(key, value);
            });
            exporter = new OTLPMetricExporterGrpc({
              ...commonConfig,
              metadata,
              url: variant.value.url,
            });
            break;
          }
          case 'http': {
            // See the `dynamicCjsExport` comment above.
            const OTLPMetricExporterHttp = dynamicCjsExport<
              typeof import('@opentelemetry/exporter-metrics-otlp-http').OTLPMetricExporter
            >(await import('@opentelemetry/exporter-metrics-otlp-http'), 'OTLPMetricExporter');
            exporter = new OTLPMetricExporterHttp({
              ...commonConfig,
              headers: variant.value.headers,
              url: variant.value.url,
            });
            break;
          }
          case 'proto': {
            // See the `dynamicCjsExport` comment above.
            const OTLPMetricExporterProto = dynamicCjsExport<
              typeof import('@opentelemetry/exporter-metrics-otlp-proto').OTLPMetricExporter
            >(await import('@opentelemetry/exporter-metrics-otlp-proto'), 'OTLPMetricExporter');
            exporter = new OTLPMetricExporterProto({
              ...commonConfig,
              headers: variant.value.headers,
              url: variant.value.url,
            });
            break;
          }
        }

        const exportInterval = variant.value.exportInterval ?? globalExportIntervalMillis;
        const exportIntervalMillis =
          typeof exportInterval === 'number' ? exportInterval : exportInterval.asMilliseconds();

        // If the exporter's export timeout is not provided, use the global export timeout only if it is less than the export interval (the client fails if the timeout is higher than the interval).
        // Otherwise, we use the export interval.
        let exportTimeoutMillis = variant.value.exportTimeout?.asMilliseconds();
        if (typeof exportTimeoutMillis !== 'number') {
          if (globalExportTimeoutMillis && globalExportTimeoutMillis <= exportIntervalMillis) {
            exportTimeoutMillis = globalExportTimeoutMillis;
          } else {
            exportTimeoutMillis = exportIntervalMillis;
          }
        }

        return new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis,
          exportTimeoutMillis,
        });
      })
    ))
  );

  const meterProvider = new MeterProvider({
    readers,
    resource,
    views: [],
  });

  metricsApi.setGlobalMeterProvider(meterProvider);

  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => (shutdownPromise ??= meterProvider.shutdown());
  cleanupBeforeExit(shutdown);
  return { forceFlush: () => meterProvider.forceFlush(), shutdown };
}
