/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray, once } from 'lodash';
import { Metadata } from '@grpc/grpc-js';
import { OTLPMetricExporter as OTLPMetricExporterGrpc } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OTLPMetricExporterHttp } from '@opentelemetry/exporter-metrics-otlp-http';
import { api, metrics, resources } from '@elastic/opentelemetry-node/sdk';
import type { MetricsConfig, MonitoringCollectionConfig } from '@kbn/metrics-config';
import { fromExternalVariant } from '@kbn/std';
import { PrometheusExporter } from './prometheus_exporter';

/**
 * Options to the initMetrics method
 */
export interface InitMetricsOptions {
  /**
   * The OpenTelemetry resource information
   */
  resource: resources.Resource;
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
 * Initialize the OpenTelemetry meter provider
 * @param initMetricsOptions {@link InitMetricsOptions}
 */
export function initMetrics(initMetricsOptions: InitMetricsOptions) {
  const { resource, metricsConfig, monitoringCollectionConfig } = initMetricsOptions;

  const globalExportIntervalMillis = metricsConfig.interval.asMilliseconds();

  const readers: metrics.IMetricReader[] = [];

  // OTel requires all readers to be initialized when initializing the SDK.
  // If the monitoring collection plugin requires the prometheus exporter, we need to initialize it now.
  if (
    monitoringCollectionConfig.enabled &&
    monitoringCollectionConfig.opentelemetry.metrics.prometheus.enabled
  ) {
    readers.push(PrometheusExporter.get());
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
      // We just need to push it as another grpc config
      exporters.push({ grpc: { url, headers, exportIntervalMillis } });
    }
  }

  readers.push(
    ...exporters.map((exporterConfig) => {
      const variant = fromExternalVariant(exporterConfig);

      let exporter: metrics.PushMetricExporter;
      switch (variant.type) {
        case 'grpc': {
          const metadata = new Metadata();
          Object.entries(variant.value.headers || {}).forEach(([key, value]) => {
            metadata.add(key, value);
          });
          exporter = new OTLPMetricExporterGrpc({
            metadata,
            url: variant.value.url,
            temporalityPreference: metrics.AggregationTemporality.DELTA,
          });
          break;
        }
        case 'http':
          exporter = new OTLPMetricExporterHttp({
            headers: variant.value.headers,
            url: variant.value.url,
            temporalityPreference: metrics.AggregationTemporality.DELTA,
          });
          break;
      }

      const exportInterval = variant.value.exportIntervalMillis ?? globalExportIntervalMillis;

      return new metrics.PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis:
          typeof exportInterval === 'number' ? exportInterval : exportInterval.asMilliseconds(),
      });
    })
  );

  const meterProvider = new metrics.MeterProvider({
    readers,
    resource,
    views: [],
  });

  api.metrics.setGlobalMeterProvider(meterProvider);

  const shutdown = once(() => meterProvider.shutdown());
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('beforeExit', shutdown);
  process.on('uncaughtExceptionMonitor', shutdown);
}
