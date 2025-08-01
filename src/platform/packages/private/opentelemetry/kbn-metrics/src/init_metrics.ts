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
import type { MetricsConfig } from '@kbn/metrics-config';
import { fromExternalVariant } from '@kbn/std';

/**
 * Options to the initMetrics method
 */
export interface InitMetricsOptions {
  /**
   * The OpenTelemetry resource information
   */
  resource: resources.Resource;
  /** The OpenTelemetry metrics configuration */
  metricsConfig: MetricsConfig;
}

/**
 * Initialize the OpenTelemetry meter provider
 * @param initMetricsOptions {@link InitMetricsOptions}
 */
export function initMetrics(initMetricsOptions: InitMetricsOptions) {
  const { resource, metricsConfig } = initMetricsOptions;

  const exportIntervalMillis = metricsConfig.interval.asMilliseconds();

  const readers = castArray(metricsConfig.exporters).map((exporterConfig) => {
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

    return new metrics.PeriodicExportingMetricReader({ exporter, exportIntervalMillis });
  });

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
