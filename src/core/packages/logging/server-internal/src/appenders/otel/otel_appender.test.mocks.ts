/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const mockEmit = jest.fn();
export const mockShutdown = jest.fn();
export const mockGetLogger = jest.fn(() => ({ emit: mockEmit }));
export const mockLoggerProvider = jest.fn(() => ({
  getLogger: mockGetLogger,
  shutdown: mockShutdown,
}));
export const mockBatchLogRecordProcessor = jest.fn();
export const mockOTLPLogExporter = jest.fn();

export const mockResourceFromAttributes = jest.fn();

interface MockResource {
  type: string;
  merge: jest.Mock<MockResource>;
}

const makeMockResource = (label: string): MockResource => ({
  type: label,
  merge: jest.fn(() => makeMockResource('merged-resource')),
});

export const mockMergeResource = jest.fn(() => makeMockResource('merged-resource'));
export const mockDetectResources = jest.fn(() => ({
  type: 'detected-resource',
  merge: mockMergeResource,
}));

jest.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: mockLoggerProvider,
  BatchLogRecordProcessor: mockBatchLogRecordProcessor,
}));

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: mockOTLPLogExporter,
}));

jest.mock('@opentelemetry/exporter-logs-otlp-grpc', () => ({
  OTLPLogExporter: mockOTLPLogExporter,
}));

jest.mock('@opentelemetry/exporter-logs-otlp-proto', () => ({
  OTLPLogExporter: mockOTLPLogExporter,
}));

jest.mock('@elastic/opentelemetry-node/sdk', () => ({
  resources: {
    detectResources: mockDetectResources,
    resourceFromAttributes: mockResourceFromAttributes,
    envDetector: 'envDetector',
    hostDetector: 'hostDetector',
    osDetector: 'osDetector',
    processDetector: 'processDetector',
  },
}));

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  // actual.trace is a class instance whose methods (getTracer, etc.) live on the prototype,
  // not as own enumerable properties. A plain spread ({ ...actual.trace }) only copies own
  // properties, silently stripping all prototype methods. We preserve the prototype chain
  // with Object.create so that code in the import graph that calls trace.getTracer() at
  // module-load time (e.g. kbn-inference-tracing) continues to work.
  const mockTrace = Object.create(Object.getPrototypeOf(actual.trace));
  Object.assign(mockTrace, actual.trace, {
    // Override ROOT_CONTEXT with a stable string so tests can assert the exact value passed to setSpanContext.
    setSpanContext: jest.fn((_ctx: unknown, spanCtx: unknown) => ({ spanContext: spanCtx })),
  });
  return {
    ...actual,
    ROOT_CONTEXT: 'root-context',
    trace: mockTrace,
  };
});

export const mockGetConfiguration = jest.fn();
jest.mock('@kbn/apm-config-loader', () => ({
  getConfiguration: mockGetConfiguration,
}));

// @kbn/telemetry re-exports initTelemetry which transitively imports @kbn/tracing and
// @kbn/metrics. Those packages load heavy OTel SDK modules (tracers, exporters, etc.)
// at require-time that are unrelated to what otel_appender.ts actually uses
// (buildOtelResources). Mocking them here keeps those module graphs from loading.
jest.mock('@kbn/tracing', () => ({
  initTracing: jest.fn(),
  LateBindingSpanProcessor: { get: jest.fn() },
  OTLPSpanProcessor: jest.fn(),
}));
jest.mock('@kbn/metrics', () => ({
  initMetrics: jest.fn(),
}));

export const mockLayoutFormat = jest.fn((record: { message: string }) => record.message);
export const mockLayoutsCreate = jest.fn(() => ({ format: mockLayoutFormat }));

jest.mock('../../layouts/layouts', () => ({
  Layouts: {
    // Use the real configSchema so that schema validation tests work correctly.
    configSchema: jest.requireActual('../../layouts/layouts').Layouts.configSchema,
    create: mockLayoutsCreate,
  },
}));
