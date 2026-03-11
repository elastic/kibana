/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OTLPMetricExporter as OTLPMetricExporterGrpc } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OTLPMetricExporterHttp } from '@opentelemetry/exporter-metrics-otlp-http';
import { duration } from 'moment';

jest.mock('@elastic/opentelemetry-node/sdk', () => {
  const actual = jest.requireActual('@elastic/opentelemetry-node/sdk');

  return {
    ...actual,
    metrics: {
      ...actual.metrics,
      MeterProvider: jest.fn((options) => {
        return new actual.metrics.MeterProvider(options);
      }),
      PeriodicExportingMetricReader: jest.fn((options) => {
        return new actual.metrics.PeriodicExportingMetricReader(options);
      }),
    },
  };
});

import { resources } from '@elastic/opentelemetry-node/sdk';
import { PrometheusExporter, initMetrics } from '..';
import type { MetricsExporterConfig } from '@kbn/metrics-config';

describe('initMetrics', () => {
  const resource = resources.resourceFromAttributes({});
  let MeterProviderMock: jest.Mock;
  let PeriodicExportingMetricReader: jest.Mock;

  const { metrics } = jest.requireActual('@elastic/opentelemetry-node/sdk');

  const exporters: MetricsExporterConfig[] = [
    {
      grpc: {
        url: 'http://remote',
        headers: { Authorization: '1234' },
        temporalityPreference: 'delta',
      },
    },
    {
      http: {
        url: 'http://remote-http',
        headers: { Authorization: '1234' },
        temporalityPreference: 'cumulative',
      },
    },
  ];

  beforeEach(() => {
    MeterProviderMock = jest.requireMock('@elastic/opentelemetry-node/sdk').metrics.MeterProvider;
    PeriodicExportingMetricReader = jest.requireMock('@elastic/opentelemetry-node/sdk').metrics
      .PeriodicExportingMetricReader;
  });

  afterEach(() => {
    PrometheusExporter.destroy();
    delete process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    jest.clearAllMocks();
  });

  test('should register the prometheus exporter if enabled in config', () => {
    initMetrics({
      resource,
      metricsConfig: { enabled: false, exporters, interval: duration(10, 's') },
      monitoringCollectionConfig: {
        enabled: true,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: true },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // no url => disabled
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [PrometheusExporter.get()],
    });
  });

  test('should register the prometheus exporter and otlp if enabled in monitoring collection config', () => {
    initMetrics({
      resource,
      metricsConfig: { enabled: false, exporters, interval: duration(10, 's') },
      monitoringCollectionConfig: {
        enabled: true,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: true },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error', url: 'http://localhost' }, // url => enabled
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [PrometheusExporter.get(), expect.any(metrics.PeriodicExportingMetricReader)],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 5000,
      exportTimeoutMillis: 5000,
    });
  });

  test('should register the otlp if enabled in monitoring collection config via env var (metrics)', () => {
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'http://localhost';
    initMetrics({
      resource,
      metricsConfig: { enabled: false, exporters, interval: duration(10, 's') },
      monitoringCollectionConfig: {
        enabled: true,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [expect.any(metrics.PeriodicExportingMetricReader)],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 5000,
      exportTimeoutMillis: 5000,
    });
  });

  test('should register the otlp if enabled in monitoring collection config via env var (global)', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost';
    initMetrics({
      resource,
      metricsConfig: { enabled: false, exporters, interval: duration(10, 's') },
      monitoringCollectionConfig: {
        enabled: true,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [expect.any(metrics.PeriodicExportingMetricReader)],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 5000,
      exportTimeoutMillis: 5000,
    });
  });

  test('should register the exporters registered via telemetry if enabled', () => {
    initMetrics({
      resource,
      metricsConfig: { enabled: true, exporters, interval: duration(10, 's') },
      monitoringCollectionConfig: {
        enabled: false,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [
        expect.any(metrics.PeriodicExportingMetricReader),
        expect.any(metrics.PeriodicExportingMetricReader),
      ],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 10000,
      exportTimeoutMillis: 10000,
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterHttp),
      exportIntervalMillis: 10000,
      exportTimeoutMillis: 10000,
    });
  });

  test('should define a custom export timeout if provided globally', () => {
    initMetrics({
      resource,
      metricsConfig: {
        enabled: true,
        exporters,
        interval: duration(10, 's'),
        timeout: duration(5, 's'),
      },
      monitoringCollectionConfig: {
        enabled: false,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [
        expect.any(metrics.PeriodicExportingMetricReader),
        expect.any(metrics.PeriodicExportingMetricReader),
      ],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 10000,
      exportTimeoutMillis: 5000,
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterHttp),
      exportIntervalMillis: 10000,
      exportTimeoutMillis: 5000,
    });
  });

  test('should discard the global export timeout if it is higher than the export interval', () => {
    initMetrics({
      resource,
      metricsConfig: {
        enabled: true,
        exporters: [
          {
            grpc: {
              url: 'http://remote',
              headers: { Authorization: '1234' },
              exportInterval: duration(5, 's'),
              temporalityPreference: 'delta',
            },
          },
        ],
        interval: duration(10, 's'),
        timeout: duration(10, 's'),
      },
      monitoringCollectionConfig: {
        enabled: false,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [expect.any(metrics.PeriodicExportingMetricReader)],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 5000,
      exportTimeoutMillis: 5000,
    });
  });

  test("should prioritize the exporter's export config over the global config if it is provided", () => {
    initMetrics({
      resource,
      metricsConfig: {
        enabled: true,
        exporters: [
          {
            grpc: {
              url: 'http://remote',
              headers: { Authorization: '1234' },
              exportInterval: duration(5, 's'),
              exportTimeout: duration(2, 's'),
              temporalityPreference: 'delta',
            },
          },
        ],
        interval: duration(10, 's'),
        timeout: duration(10, 's'),
      },
      monitoringCollectionConfig: {
        enabled: false,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [expect.any(metrics.PeriodicExportingMetricReader)],
    });
    expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
      exporter: expect.any(OTLPMetricExporterGrpc),
      exportIntervalMillis: 5000,
      exportTimeoutMillis: 2000,
    });
  });

  test('should not register any readers', () => {
    initMetrics({
      resource,
      metricsConfig: { enabled: false, exporters, interval: duration(10, 's') },
      monitoringCollectionConfig: {
        enabled: false,
        opentelemetry: {
          metrics: {
            prometheus: { enabled: false },
            otlp: { exportIntervalMillis: 5000, logLevel: 'error' }, // url set via env var
          },
        },
      },
    });
    expect(MeterProviderMock).toHaveBeenCalledWith({
      resource,
      views: [],
      readers: [],
    });
  });
});
