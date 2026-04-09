/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockBatchLogRecordProcessor,
  mockDetectResources,
  mockEmit,
  mockGetConfiguration,
  mockLoggerProvider,
  mockMergeResource,
  mockOTLPLogExporter,
  mockResourceFromAttributes,
  mockShutdown,
} from './otel_appender.test.mocks';

import { trace } from '@opentelemetry/api';
import { LogLevel } from '@kbn/logging';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { OtelAppender } from './otel_appender';

const validConfig = {
  type: 'otel' as const,
  url: 'http://collector:4318/v1/logs',
  headers: { Authorization: 'Bearer token' },
};

const makeRecord = (overrides = {}) => ({
  context: 'test.context',
  level: LogLevel.Info,
  message: 'test message',
  timestamp: new Date('2024-01-01T00:00:00Z'),
  pid: 1234,
  ...overrides,
});

beforeEach(() => {
  mockEmit.mockReset();
  mockShutdown.mockReset();
  mockLoggerProvider.mockClear();
  mockBatchLogRecordProcessor.mockClear();
  mockOTLPLogExporter.mockClear();
  mockResourceFromAttributes.mockClear();
  mockDetectResources.mockClear();
  mockMergeResource.mockClear();
  mockGetConfiguration.mockClear();
  jest.mocked(trace.setSpanContext).mockClear();
});

describe('OtelAppender.configSchema', () => {
  it('validates a minimal config (url only required)', () => {
    const result = OtelAppender.configSchema.validate({
      type: 'otel',
      url: 'http://collector:4318/v1/logs',
    });
    expect(result.url).toBe('http://collector:4318/v1/logs');
    expect(result.headers).toEqual({});
    expect(result.attributes).toBeUndefined();
  });

  it('accepts optional user-provided attributes to override defaults', () => {
    const result = OtelAppender.configSchema.validate({
      ...validConfig,
      attributes: { 'service.name': 'my-kibana' },
    });
    expect(result.attributes).toEqual({ 'service.name': 'my-kibana' });
  });

  it('rejects config without url', () => {
    expect(() => OtelAppender.configSchema.validate({ type: 'otel' })).toThrow();
  });

  it('rejects config with wrong type', () => {
    expect(() => OtelAppender.configSchema.validate({ ...validConfig, type: 'console' })).toThrow();
  });
});

describe('OtelAppender constructor', () => {
  it('creates OTLPLogExporter with url and headers from config', () => {
    new OtelAppender(validConfig);

    expect(mockOTLPLogExporter).toHaveBeenCalledWith({
      url: validConfig.url,
      headers: validConfig.headers,
    });
  });

  it('derives service.name, service.version and deployment.environment from the APM config singleton', () => {
    mockGetConfiguration.mockReturnValue({
      serviceName: 'kibana',
      serviceVersion: '9.4.0',
      environment: 'production',
    });

    new OtelAppender(validConfig);

    expect(mockGetConfiguration).toHaveBeenCalledWith('kibana');
    expect(mockResourceFromAttributes).toHaveBeenCalledWith({
      'service.name': 'kibana',
      'service.version': '9.4.0',
      'deployment.environment': 'production',
    });
  });

  it('omits service attributes whose APM config value is falsy', () => {
    mockGetConfiguration.mockReturnValue({ serviceName: 'kibana' }); // no version or environment

    new OtelAppender(validConfig);

    expect(mockResourceFromAttributes).toHaveBeenCalledWith({ 'service.name': 'kibana' });
  });

  it('produces no service attributes when the APM config singleton is not initialised', () => {
    mockGetConfiguration.mockReturnValue(undefined);

    new OtelAppender(validConfig);

    expect(mockResourceFromAttributes).toHaveBeenCalledWith({});
  });

  it('user-provided attributes override the APM-derived ones', () => {
    mockGetConfiguration.mockReturnValue({ serviceName: 'kibana', environment: 'development' });

    new OtelAppender({
      ...validConfig,
      attributes: { 'service.name': 'custom-kibana', 'deployment.environment': 'staging' },
    });

    // The user override is passed as the last merge layer.
    expect(mockResourceFromAttributes).toHaveBeenCalledWith({
      'service.name': 'custom-kibana',
      'deployment.environment': 'staging',
    });
  });

  it('auto-detects host/process/OS/env attributes via resource detectors', () => {
    new OtelAppender(validConfig);

    expect(mockDetectResources).toHaveBeenCalledWith({
      detectors: expect.arrayContaining([
        'envDetector',
        'hostDetector',
        'osDetector',
        'processDetector',
      ]),
    });
  });
});

describe('OtelAppender.append() — severity mapping', () => {
  it.each([
    {
      name: 'trace',
      level: LogLevel.Trace,
      severityNumber: SeverityNumber.TRACE,
      severityText: 'TRACE',
    },
    {
      name: 'debug',
      level: LogLevel.Debug,
      severityNumber: SeverityNumber.DEBUG,
      severityText: 'DEBUG',
    },
    {
      name: 'info',
      level: LogLevel.Info,
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
    },
    {
      name: 'warn',
      level: LogLevel.Warn,
      severityNumber: SeverityNumber.WARN,
      severityText: 'WARN',
    },
    {
      name: 'error',
      level: LogLevel.Error,
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
    },
    {
      name: 'fatal',
      level: LogLevel.Fatal,
      severityNumber: SeverityNumber.FATAL,
      severityText: 'FATAL',
    },
  ])(
    'maps log level $name to severityNumber $severityNumber and severityText $severityText',
    ({ level, severityNumber, severityText }) => {
      const appender = new OtelAppender(validConfig);
      appender.append(makeRecord({ level }));

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({ severityNumber, severityText })
      );
    }
  );

  it.each([
    ['off', LogLevel.Off],
    ['all', LogLevel.All],
  ])('silently drops records with filter-only level %s', (_name, level) => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord({ level }));

    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('OtelAppender.append() — body', () => {
  it('uses record.message as the body (plain text, not a JSON blob)', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord({ message: 'hello world' }));

    expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ body: 'hello world' }));
  });
});

describe('OtelAppender.append() — trace context', () => {
  it('passes trace context via OTel context API when traceId and spanId are present', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord({ traceId: 'abc123', spanId: 'def456' }));

    expect(trace.setSpanContext).toHaveBeenCalledWith('root-context', {
      traceId: 'abc123',
      spanId: 'def456',
      traceFlags: 1, // TraceFlags.SAMPLED
      isRemote: false,
    });
    const emittedContext = mockEmit.mock.calls[0][0].context;
    expect(emittedContext).toBeDefined();
  });

  it('omits context when the record has no trace identifiers', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord());

    expect(trace.setSpanContext).not.toHaveBeenCalled();
    expect(mockEmit.mock.calls[0][0].context).toBeUndefined();
  });

  it('does not include trace.id or span.id in log record attributes', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord({ traceId: 'abc123', spanId: 'def456' }));

    const { attributes } = mockEmit.mock.calls[0][0];
    expect(attributes).not.toHaveProperty('trace.id');
    expect(attributes).not.toHaveProperty('span.id');
  });
});

describe('OtelAppender.append() — attributes', () => {
  it('emits the correct timestamp and log.logger attribute', () => {
    const appender = new OtelAppender(validConfig);
    const timestamp = new Date('2024-06-15T12:00:00Z');
    appender.append(makeRecord({ timestamp, context: 'my.plugin' }));

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp,
        attributes: expect.objectContaining({ 'log.logger': 'my.plugin' }),
      })
    );
  });

  it('does not include process.pid in log record attributes (it lives in the resource)', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord({ pid: 9999 }));

    const { attributes } = mockEmit.mock.calls[0][0];
    expect(attributes).not.toHaveProperty('process.pid');
  });

  it('maps error to OTel exception semantic convention attributes', () => {
    const appender = new OtelAppender(validConfig);
    const error = new Error('something went wrong');
    appender.append(makeRecord({ error }));

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          'exception.type': 'Error',
          'exception.message': 'something went wrong',
          'exception.stacktrace': error.stack,
        }),
      })
    );
  });

  it('omits exception attributes when no error is present', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord());

    const { attributes } = mockEmit.mock.calls[0][0];
    expect(attributes).not.toHaveProperty('exception.type');
    expect(attributes).not.toHaveProperty('exception.message');
    expect(attributes).not.toHaveProperty('exception.stacktrace');
  });

  it('includes transactionId as transaction.id attribute', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord({ transactionId: 'txn-123' }));

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ 'transaction.id': 'txn-123' }),
      })
    );
  });

  it('JSON-serialises meta and includes it as log.meta attribute', () => {
    const appender = new OtelAppender(validConfig);
    const meta = { http: { method: 'GET' }, tags: ['api'] };
    appender.append(makeRecord({ meta }));

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ 'log.meta': JSON.stringify(meta) }),
      })
    );
  });

  it('omits log.meta when meta is not present', () => {
    const appender = new OtelAppender(validConfig);
    appender.append(makeRecord());

    const { attributes } = mockEmit.mock.calls[0][0];
    expect(attributes).not.toHaveProperty('log.meta');
  });
});

describe('OtelAppender.dispose()', () => {
  it('shuts down the logger provider', async () => {
    mockShutdown.mockResolvedValue(undefined);
    const appender = new OtelAppender(validConfig);
    await appender.dispose();

    expect(mockShutdown).toHaveBeenCalledTimes(1);
  });

  it('resolves even if shutdown hangs (timeout guard)', async () => {
    jest.useFakeTimers();
    mockShutdown.mockReturnValue(new Promise(() => {})); // never resolves
    const appender = new OtelAppender(validConfig);

    const disposePromise = appender.dispose();
    jest.runAllTimers();
    await expect(disposePromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });
});
