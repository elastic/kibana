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

jest.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: mockLoggerProvider,
  BatchLogRecordProcessor: mockBatchLogRecordProcessor,
}));

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: mockOTLPLogExporter,
}));

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: mockResourceFromAttributes,
}));
