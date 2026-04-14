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

jest.mock('@opentelemetry/resources', () => ({
  detectResources: mockDetectResources,
  resourceFromAttributes: mockResourceFromAttributes,
  envDetector: 'envDetector',
  hostDetector: 'hostDetector',
  osDetector: 'osDetector',
  processDetector: 'processDetector',
}));

jest.mock('@opentelemetry/api', () => ({
  ROOT_CONTEXT: 'root-context',
  TraceFlags: { SAMPLED: 1 },
  trace: {
    setSpanContext: jest.fn((_ctx, spanCtx) => ({ spanContext: spanCtx })),
  },
}));

export const mockGetConfiguration = jest.fn();
jest.mock('@kbn/apm-config-loader', () => ({
  getConfiguration: mockGetConfiguration,
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
