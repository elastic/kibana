/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const mockCreateLayout = jest.fn();
jest.mock('../layouts/layouts', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { schema } = require('@kbn/config-schema');
  return {
    Layouts: {
      configSchema: schema.object({ type: schema.literal('mock') }),
      create: mockCreateLayout,
    },
  };
});

jest.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: jest.fn(() => ({ getLogger: jest.fn(() => ({ emit: jest.fn() })) })),
  BatchLogRecordProcessor: jest.fn(),
}));
jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: jest.fn(),
}));
jest.mock('@elastic/opentelemetry-node/sdk', () => {
  interface MockResource {
    merge: jest.Mock<MockResource>;
  }
  const makeMergeableResource = (): MockResource => ({ merge: jest.fn(makeMergeableResource) });
  return {
    resources: {
      detectResources: jest.fn(makeMergeableResource),
      resourceFromAttributes: jest.fn(makeMergeableResource),
      envDetector: 'envDetector',
      hostDetector: 'hostDetector',
      osDetector: 'osDetector',
      processDetector: 'processDetector',
    },
  };
});
jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  // Preserve the prototype chain so prototype methods like getTracer() remain accessible.
  // A plain spread ({ ...actual.trace }) only copies own enumerable properties and silently
  // drops all prototype methods, which causes failures when kbn-inference-tracing calls
  // trace.getTracer() at module-load time.
  const mockTrace = Object.create(Object.getPrototypeOf(actual.trace));
  Object.assign(mockTrace, actual.trace, { setSpanContext: jest.fn() });
  return { ...actual, ROOT_CONTEXT: 'root-context', trace: mockTrace };
});
jest.mock('@kbn/apm-config-loader', () => ({
  getConfiguration: jest.fn(() => ({ serviceName: 'kibana', serviceVersion: '9.0.0' })),
}));
// @kbn/telemetry re-exports initTelemetry which transitively imports @kbn/tracing and
// @kbn/metrics. Those packages load heavy OTel SDK modules at require-time that are
// unrelated to what otel_appender.ts actually uses (buildOtelResources). Mocking them
// here prevents those module graphs from loading.
jest.mock('@kbn/tracing', () => ({
  initTracing: jest.fn(),
  LateBindingSpanProcessor: { get: jest.fn() },
  OTLPSpanProcessor: jest.fn(),
}));
jest.mock('@kbn/metrics', () => ({
  initMetrics: jest.fn(),
}));
