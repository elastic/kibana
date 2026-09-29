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

export const mockCreateLayout = vi.fn();
vi.mock('../layouts/layouts', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { schema } = require('@kbn/config-schema');
  return {
    Layouts: {
      configSchema: schema.object({ type: schema.literal('mock') }),
      create: mockCreateLayout,
    },
  };
});

vi.mock('@opentelemetry/sdk-logs', () => {
      const mocked = {
      LoggerProvider: vi.fn(() => ({ getLogger: vi.fn(() => ({ emit: vi.fn() })) })),
      BatchLogRecordProcessor: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@opentelemetry/exporter-logs-otlp-http', () => {
      const mocked = {
      OTLPLogExporter: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@elastic/opentelemetry-node/sdk', () => {
  interface MockResource {
    merge: Mock<MockResource>;
  }
  const makeMergeableResource = (): MockResource => ({ merge: vi.fn(makeMergeableResource) });
  return {
    resources: {
      detectResources: vi.fn(makeMergeableResource),
      resourceFromAttributes: vi.fn(makeMergeableResource),
      envDetector: 'envDetector',
      hostDetector: 'hostDetector',
      osDetector: 'osDetector',
      processDetector: 'processDetector',
    },
  };
});
vi.mock('@opentelemetry/api', () => {
  const actual = require('@opentelemetry/api');
  // Preserve the prototype chain so prototype methods like getTracer() remain accessible.
  // A plain spread ({ ...actual.trace }) only copies own enumerable properties and silently
  // drops all prototype methods, which causes failures when kbn-inference-tracing calls
  // trace.getTracer() at module-load time.
  const mockTrace = Object.create(Object.getPrototypeOf(actual.trace));
  Object.assign(mockTrace, actual.trace, { setSpanContext: vi.fn() });
  return { ...actual, ROOT_CONTEXT: 'root-context', trace: mockTrace };
});
vi.mock('@kbn/apm-config-loader', () => {
      const mocked = {
      getConfiguration: vi.fn(() => ({ serviceName: 'kibana', serviceVersion: '9.0.0' })),
    };
      return { ...mocked, default: mocked };
    });
// @kbn/telemetry re-exports initTelemetry which transitively imports @kbn/tracing and
// @kbn/metrics. Those packages load heavy OTel SDK modules at require-time that are
// unrelated to what otel_appender.ts actually uses (buildOtelResources). Mocking them
// here prevents those module graphs from loading.
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
