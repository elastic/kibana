/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Resource } from '@opentelemetry/resources';
import {
  AggregationTemporality,
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter,
} from '@opentelemetry/sdk-metrics';
import { MetricsConfig } from '@kbn/metrics-config';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { fromExternalVariant } from '@kbn/std';
import { castArray } from 'lodash';
import { AgentConfigOptions, secondsFromDuration } from '@kbn/telemetry-config';
import { metrics } from '@opentelemetry/api';
import { MetricsApi } from './types';
import { createLegacyMetricsApi } from './legacy/create_legacy_metrics_api';

export let metricsApi: MetricsApi | undefined;

export function initMetrics({
  apmConfig,
  metricsConfig,
  resource,
}: {
  apmConfig: AgentConfigOptions;
  metricsConfig?: MetricsConfig;
  resource: Resource;
}): MetricsApi {
  const metricsInterval = apmConfig.metricsInterval || '30s';

  const exporters = castArray(metricsConfig?.exporters ?? []).map((exporterConfig) => {
    const variant = fromExternalVariant(exporterConfig);

    switch (variant.type) {
      case 'grpc':
        return new OTLPMetricExporter({
          headers: variant.value.headers,
          url: variant.value.url,
          temporalityPreference: AggregationTemporality.DELTA,
        });
    }
  });

  function createPeriodMetricExportingReader(exporter: PushMetricExporter) {
    const reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: secondsFromDuration(metricsInterval),
    });

    return reader;
  }

  const meterProvider = new MeterProvider({
    readers: exporters.map((exporter) => createPeriodMetricExportingReader(exporter)),
    resource,
    views: [],
  });

  metrics.setGlobalMeterProvider(meterProvider);

  const defaultMeter = metrics.getMeter('kibana');

  metricsApi = {
    legacy: createLegacyMetricsApi({
      meter: defaultMeter,
    }),
    getDefaultMeter: () => defaultMeter,
  };

  return metricsApi;
}
