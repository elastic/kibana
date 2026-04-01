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
  mockEmit,
  mockLoggerProvider,
  mockOTLPLogExporter,
  mockResourceFromAttributes,
  mockShutdown,
} from './otel_appender.test.mocks';

import { LogLevel } from '@kbn/logging';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { OtelAppender } from './otel_appender';

const validConfig = {
  type: 'otel' as const,
  url: 'http://collector:4318/v1/logs',
  headers: { Authorization: 'Bearer token' },
  attributes: { 'service.name': 'kibana' },
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
});

describe('OtelAppender.configSchema', () => {
  it('validates a complete valid config', () => {
    expect(OtelAppender.configSchema.validate(validConfig)).toEqual(validConfig);
  });

  it('applies default empty objects for headers and attributes', () => {
    const result = OtelAppender.configSchema.validate({
      type: 'otel',
      url: 'http://collector:4318/v1/logs',
    });
    expect(result.headers).toEqual({});
    expect(result.attributes).toEqual({});
  });

  it('rejects config without url', () => {
    expect(() =>
      OtelAppender.configSchema.validate({ type: 'otel', headers: {}, attributes: {} })
    ).toThrow();
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

  it('creates LoggerProvider with BatchLogRecordProcessor and resource attributes', () => {
    const mockResource = { type: 'resource' };
    mockResourceFromAttributes.mockReturnValue(mockResource);

    new OtelAppender(validConfig);

    expect(mockResourceFromAttributes).toHaveBeenCalledWith(validConfig.attributes);
    expect(mockBatchLogRecordProcessor).toHaveBeenCalledWith(expect.any(Object));
    expect(mockLoggerProvider).toHaveBeenCalledWith({
      processors: [expect.any(Object)],
      resource: mockResource,
    });
  });
});

describe('OtelAppender.append()', () => {
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
      const record = makeRecord({ level });

      appender.append(record);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityNumber,
          severityText,
        })
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

  it('emits the correct timestamp, body, and base attributes', () => {
    const appender = new OtelAppender(validConfig);
    const timestamp = new Date('2024-06-15T12:00:00Z');
    const record = makeRecord({ timestamp, context: 'my.plugin', pid: 9999 });

    appender.append(record);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp,
        body: 'test message',
        attributes: expect.objectContaining({
          'log.logger': 'my.plugin',
          'process.pid': 9999,
        }),
      })
    );
  });

  it('maps error to exception semantic convention attributes', () => {
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

  it('includes traceId and spanId as attributes when present', () => {
    const appender = new OtelAppender(validConfig);

    appender.append(makeRecord({ traceId: 'trace-abc', spanId: 'span-xyz' }));

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          'trace.id': 'trace-abc',
          'span.id': 'span-xyz',
        }),
      })
    );
  });

  it('omits trace attributes when not present', () => {
    const appender = new OtelAppender(validConfig);

    appender.append(makeRecord());

    const { attributes } = mockEmit.mock.calls[0][0];
    expect(attributes).not.toHaveProperty('trace.id');
    expect(attributes).not.toHaveProperty('span.id');
    expect(attributes).not.toHaveProperty('transaction.id');
  });

  it('JSON-serialises meta and includes it as log.meta attribute', () => {
    const appender = new OtelAppender(validConfig);
    const meta = { http: { method: 'GET' }, tags: ['api'] };

    appender.append(makeRecord({ meta }));

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          'log.meta': JSON.stringify(meta),
        }),
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
