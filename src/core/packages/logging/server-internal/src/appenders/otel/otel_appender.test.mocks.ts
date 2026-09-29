/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

export const mockEmit = vi.fn();
export const mockShutdown = vi.fn();
export const mockGetLogger = vi.fn(() => ({ emit: mockEmit }));
export const mockLoggerProvider = vi.fn(() => ({
  getLogger: mockGetLogger,
  shutdown: mockShutdown,
}));
export const mockBatchLogRecordProcessor = vi.fn();
export const mockOTLPLogExporter = vi.fn();

export const mockResourceFromAttributes = vi.fn();

export interface MockResource {
  type: string;
  attributes: Record<string, unknown>;
  merge: Mock<MockResource>;
  getRawAttributes: Mock<Array<[string, unknown]>>;
}

export const makeMockResource = (
  label: string,
  attributes: Record<string, unknown> = {}
): MockResource => ({
  type: label,
  attributes,
  merge: vi.fn(() => makeMockResource('merged-resource')),
  getRawAttributes: vi.fn(() => Object.entries(attributes)),
});

export const mockMergeResource = vi.fn(() => makeMockResource('merged-resource'));
export const mockDetectResources = vi.fn(() => ({
  type: 'detected-resource',
  merge: mockMergeResource,
}));

vi.mock('@opentelemetry/sdk-logs', () => {
  const mocked = {
    LoggerProvider: mockLoggerProvider,
    BatchLogRecordProcessor: mockBatchLogRecordProcessor,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@opentelemetry/exporter-logs-otlp-http', () => {
  const mocked = {
    OTLPLogExporter: mockOTLPLogExporter,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@opentelemetry/exporter-logs-otlp-grpc', () => {
  const mocked = {
    OTLPLogExporter: mockOTLPLogExporter,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@opentelemetry/exporter-logs-otlp-proto', () => {
  const mocked = {
    OTLPLogExporter: mockOTLPLogExporter,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@elastic/opentelemetry-node/sdk', () => {
  const mocked = {
    resources: {
      detectResources: mockDetectResources,
      resourceFromAttributes: mockResourceFromAttributes,
      envDetector: 'envDetector',
      hostDetector: 'hostDetector',
      osDetector: 'osDetector',
      processDetector: 'processDetector',
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('@opentelemetry/api', () => {
  const actual = require('@opentelemetry/api');
  // actual.trace is a class instance whose methods (getTracer, etc.) live on the prototype,
  // not as own enumerable properties. A plain spread ({ ...actual.trace }) only copies own
  // properties, silently stripping all prototype methods. We preserve the prototype chain
  // with Object.create so that code in the import graph that calls trace.getTracer() at
  // module-load time (e.g. kbn-inference-tracing) continues to work.
  const mockTrace = Object.create(Object.getPrototypeOf(actual.trace));
  Object.assign(mockTrace, actual.trace, {
    // Override ROOT_CONTEXT with a stable string so tests can assert the exact value passed to setSpanContext.
    setSpanContext: vi.fn((_ctx: unknown, spanCtx: unknown) => ({ spanContext: spanCtx })),
  });
  return {
    ...actual,
    ROOT_CONTEXT: 'root-context',
    trace: mockTrace,
  };
});

export const mockGetConfiguration = vi.fn();
vi.mock('@kbn/apm-config-loader', () => {
  const mocked = {
    getConfiguration: mockGetConfiguration,
  };
  return { ...mocked, default: mocked };
});

// @kbn/telemetry re-exports initTelemetry which transitively imports @kbn/tracing and
// @kbn/metrics. Those packages load heavy OTel SDK modules (tracers, exporters, etc.)
// at require-time that are unrelated to what otel_appender.ts actually uses
// (buildOtelResources). Mocking them here keeps those module graphs from loading.
vi.mock('@kbn/tracing', () => {
  const mocked = {
    initTracing: vi.fn(),
    LateBindingSpanProcessor: { get: vi.fn() },
    OTLPSpanProcessor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/metrics', () => {
  const mocked = {
    initMetrics: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
