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
jest.mock('@opentelemetry/resources', () => {
  interface MockResource {
    merge: jest.Mock<MockResource>;
  }
  const makeMergeableResource = (): MockResource => ({ merge: jest.fn(makeMergeableResource) });
  return {
    detectResources: jest.fn(makeMergeableResource),
    resourceFromAttributes: jest.fn(makeMergeableResource),
    envDetector: 'envDetector',
    hostDetector: 'hostDetector',
    osDetector: 'osDetector',
    processDetector: 'processDetector',
  };
});
jest.mock('@opentelemetry/api', () => ({
  ROOT_CONTEXT: 'root-context',
  TraceFlags: { SAMPLED: 1 },
  trace: { setSpanContext: jest.fn() },
}));
jest.mock('@kbn/apm-config-loader', () => ({
  getConfiguration: jest.fn(() => ({ serviceName: 'kibana', serviceVersion: '9.0.0' })),
}));
