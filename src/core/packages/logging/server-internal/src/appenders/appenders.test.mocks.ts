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
jest.mock('@opentelemetry/resources', () => ({
  detectResources: jest.fn(() => ({ merge: jest.fn() })),
  resourceFromAttributes: jest.fn(),
  envDetector: 'envDetector',
  hostDetector: 'hostDetector',
  osDetector: 'osDetector',
  processDetector: 'processDetector',
}));
