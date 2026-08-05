/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  makeMockResource,
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

import { set } from '@kbn/safer-lodash-set';
import { trace } from '@opentelemetry/api';
import { LogLevel } from '@kbn/logging';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { OtelAppender } from './otel_appender';
import { Layouts } from '../../layouts/layouts';
import { JsonLayout } from '../../layouts/json_layout';

const validConfig = {
  type: 'otel' as const,
  protocol: 'http' as const,
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

describe('OtelAppender', () => {
  let mockLayoutFormat: jest.SpyInstance;
  let mockLayoutsCreate: jest.SpyInstance;

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
    const originalLayoutsCreate = Layouts.create;
    mockLayoutsCreate = jest.spyOn(Layouts, 'create').mockImplementation((opts) => {
      const layout = originalLayoutsCreate(opts);
      mockLayoutFormat = jest.spyOn(layout, 'format');
      return layout;
    });
    jest.mocked(trace.setSpanContext).mockClear();
  });

  afterEach(() => {
    mockLayoutsCreate.mockRestore();
  });

  describe('configSchema', () => {
    it('validates a minimal config (url only required)', () => {
      const result = OtelAppender.configSchema.validate({
        type: 'otel',
        url: 'http://collector:4318/v1/logs',
      });
      expect(result.url).toBe('http://collector:4318/v1/logs');
      expect(result.headers).toEqual({});
      expect(result.layout).toBeUndefined();
      expect(result.attributes).toBeUndefined();
    });

    it('accepts a json layout config', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        layout: { type: 'json' },
      });
      expect(result.layout).toEqual({ type: 'json' });
    });

    it('accepts a pattern layout config', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        layout: { type: 'pattern', pattern: '[%p] %m' },
      });
      expect(result.layout).toEqual({ type: 'pattern', pattern: '[%p] %m' });
    });

    it('accepts optional user-provided attributes to override defaults', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        attributes: { 'service.name': 'my-kibana' },
      });
      expect(result.attributes).toEqual({ 'service.name': 'my-kibana' });
    });

    it('accepts fieldRenames with string target', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        fieldRenames: { 'kibana.space_id': 'kibana.space.id' },
      });
      expect(result.fieldRenames).toEqual({ 'kibana.space_id': 'kibana.space.id' });
    });

    it('accepts fieldRenames with array target (fan-out)', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        fieldRenames: { 'client.ip': ['source.address', 'source.ip'] },
      });
      expect(result.fieldRenames).toEqual({ 'client.ip': ['source.address', 'source.ip'] });
    });

    it('is optional and absent by default', () => {
      const result = OtelAppender.configSchema.validate({
        type: 'otel',
        url: 'http://collector:4318/v1/logs',
      });
      expect(result.fieldRenames).toBeUndefined();
    });

    it('fieldDrops, fieldUppercase, fieldDefaults, fieldAdditions and includeResources are optional and absent by default', () => {
      const result = OtelAppender.configSchema.validate({
        type: 'otel',
        url: 'http://collector:4318/v1/logs',
      });
      expect(result.fieldDrops).toBeUndefined();
      expect(result.fieldUppercase).toBeUndefined();
      expect(result.fieldDefaults).toBeUndefined();
      expect(result.fieldAdditions).toBeUndefined();
      expect(result.includeResources).toBeUndefined();
      expect(result.promoteResourceAttributes).toBeUndefined();
    });

    it('accepts fieldAdditions as a map of template strings', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        fieldAdditions: { 'url.original': '{url.scheme}://{url.domain}{url.path}' },
      });
      expect(result.fieldAdditions).toEqual({
        'url.original': '{url.scheme}://{url.domain}{url.path}',
      });
    });

    it('accepts includeResources as an array of strings', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        includeResources: ['service.name', 'service.type'],
      });
      expect(result.includeResources).toEqual(['service.name', 'service.type']);
    });

    it('accepts promoteResourceAttributes as an array of strings', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        promoteResourceAttributes: ['project.id'],
      });
      expect(result.promoteResourceAttributes).toEqual(['project.id']);
    });

    it('accepts fieldUppercase as an array of strings', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        fieldUppercase: ['http.request.method'],
      });
      expect(result.fieldUppercase).toEqual(['http.request.method']);
    });

    it('accepts fieldDrops as an array of strings', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        fieldDrops: ['service.version', 'host.name'],
      });
      expect(result.fieldDrops).toEqual(['service.version', 'host.name']);
    });

    it('accepts fieldDefaults with string and array values', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        fieldDefaults: { 'event.type': ['access'], 'event.kind': 'event' },
      });
      expect(result.fieldDefaults).toEqual({ 'event.type': ['access'], 'event.kind': 'event' });
    });

    it('rejects config without url', () => {
      expect(() => OtelAppender.configSchema.validate({ type: 'otel' })).toThrow();
    });

    it('rejects config with wrong type', () => {
      expect(() =>
        OtelAppender.configSchema.validate({ ...validConfig, type: 'console' })
      ).toThrow();
    });

    it('rejects ssl.certificate without ssl.key', () => {
      expect(() =>
        OtelAppender.configSchema.validate({
          ...validConfig,
          ssl: { certificate: '/path/to/cert.pem' },
        })
      ).toThrow(/ssl\.key/);
    });

    it('rejects ssl.key without ssl.certificate', () => {
      expect(() =>
        OtelAppender.configSchema.validate({
          ...validConfig,
          ssl: { key: '/path/to/key.pem' },
        })
      ).toThrow(/ssl\.certificate/);
    });

    it('rejects ssl.keyPassphrase without ssl.key', () => {
      expect(() =>
        OtelAppender.configSchema.validate({
          ...validConfig,
          ssl: { keyPassphrase: 'secret' },
        })
      ).toThrow(/ssl\.key/);
    });

    it('accepts optional ssl.tls settings', () => {
      const result = OtelAppender.configSchema.validate({
        ...validConfig,
        ssl: {
          verificationMode: 'full',
          certificateAuthorities: '/etc/ssl/custom-ca.pem',
          certificate: '/etc/ssl/client.crt',
          key: '/etc/ssl/client.key',
        },
      });
      expect(result.ssl?.verificationMode).toBe('full');
      expect(result.ssl?.certificateAuthorities).toBe('/etc/ssl/custom-ca.pem');
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

    it('passes httpAgentOptions when ssl is set (HTTP exporter)', () => {
      new OtelAppender({
        ...validConfig,
        ssl: { verificationMode: 'none' },
      });

      expect(mockOTLPLogExporter).toHaveBeenCalledWith({
        url: validConfig.url,
        headers: validConfig.headers,
        httpAgentOptions: expect.objectContaining({ rejectUnauthorized: false }),
      });
    });

    it('passes httpAgentOptions for proto protocol when ssl is set', () => {
      new OtelAppender({
        ...validConfig,
        protocol: 'proto',
        ssl: { verificationMode: 'full' },
      });

      expect(mockOTLPLogExporter).toHaveBeenCalledWith({
        url: validConfig.url,
        headers: validConfig.headers,
        httpAgentOptions: expect.objectContaining({ rejectUnauthorized: true }),
      });
    });

    it('passes grpc channel credentials when ssl is set', () => {
      new OtelAppender({
        type: 'otel',
        protocol: 'grpc',
        url: 'https://collector:4317',
        ssl: { verificationMode: 'none' },
      });

      expect(mockOTLPLogExporter).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://collector:4317',
          metadata: expect.anything(),
          credentials: expect.anything(),
        })
      );
    });

    it('defaults to empty headers when none are provided', () => {
      new OtelAppender({ type: 'otel', url: validConfig.url, protocol: 'http' });

      expect(mockOTLPLogExporter).toHaveBeenCalledWith({
        url: validConfig.url,
        headers: {},
      });
    });

    it('creates a pattern layout with the OTel-specific default pattern when no layout is configured', () => {
      new OtelAppender(validConfig);

      expect(mockLayoutsCreate).toHaveBeenCalledWith({
        type: 'pattern',
        pattern: '%message %error',
      });
    });

    it('uses the OTel-specific "%message %error" pattern when pattern type is requested without a custom string', () => {
      new OtelAppender({ ...validConfig, layout: { type: 'pattern' } });

      expect(mockLayoutsCreate).toHaveBeenCalledWith({
        type: 'pattern',
        pattern: '%message %error',
      });
    });

    it('preserves an explicit custom pattern string provided by the user', () => {
      new OtelAppender({ ...validConfig, layout: { type: 'pattern', pattern: '%m' } });

      expect(mockLayoutsCreate).toHaveBeenCalledWith({ type: 'pattern', pattern: '%m' });
    });

    it('creates a JSON layout when explicitly configured', () => {
      new OtelAppender({ ...validConfig, layout: { type: 'json' } });

      expect(mockLayoutsCreate).toHaveBeenCalledWith({ type: 'json' });
    });

    it('always includes telemetry.sdk.language: nodejs in derived attributes', () => {
      mockGetConfiguration.mockReturnValue(undefined);

      new OtelAppender(validConfig);

      expect(mockResourceFromAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'telemetry.sdk.language': 'nodejs' })
      );
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
        'telemetry.sdk.language': 'nodejs',
        'service.name': 'kibana',
        'service.version': '9.4.0',
        'deployment.environment.name': 'production',
      });
    });

    it('derives service.instance.id from kibana_uuid in APM global labels', () => {
      mockGetConfiguration.mockReturnValue({
        serviceName: 'kibana',
        globalLabels: { kibana_uuid: 'test-uuid-123' },
      });

      new OtelAppender(validConfig);

      expect(mockResourceFromAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'service.instance.id': 'test-uuid-123' })
      );
    });

    it('omits service.instance.id when kibana_uuid is absent from global labels', () => {
      mockGetConfiguration.mockReturnValue({ serviceName: 'kibana', globalLabels: {} });

      new OtelAppender(validConfig);

      expect(mockResourceFromAttributes).toHaveBeenCalledWith(
        expect.not.objectContaining({ 'service.instance.id': expect.anything() })
      );
    });

    it('omits APM-derived service attributes whose config value is falsy', () => {
      mockGetConfiguration.mockReturnValue({ serviceName: 'kibana' }); // no version, environment or uuid

      new OtelAppender(validConfig);

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'telemetry.sdk.language': 'nodejs',
        'service.name': 'kibana',
      });
    });

    it('only emits telemetry.sdk.language when the APM config singleton is not initialised', () => {
      mockGetConfiguration.mockReturnValue(undefined);

      new OtelAppender(validConfig);

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'telemetry.sdk.language': 'nodejs',
      });
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

    describe('includeResources', () => {
      // Wires buildOtelResources().merge(...) to resolve to a resource whose getRawAttributes()
      // returns the given entries, so we can assert what survives the allowlist/denylist filter.
      const wireResourceWithRawAttributes = (rawAttributes: Array<[string, unknown]>) => {
        const resourceWithKnownRaw = makeMockResource('known');
        (resourceWithKnownRaw.getRawAttributes as jest.Mock).mockReturnValue(rawAttributes);
        const r1 = makeMockResource('r1', {});
        r1.merge.mockReturnValueOnce(resourceWithKnownRaw);
        mockMergeResource.mockReturnValueOnce(r1);
        return resourceWithKnownRaw;
      };

      it('filters the resource to the allowlisted keys (detectors still run)', () => {
        wireResourceWithRawAttributes([
          ['service.name', 'serverless-kibana'],
          ['service.type', 'kibana'],
          ['host.name', 'my-host'],
          ['process.pid', 123],
          ['telemetry.sdk.language', 'nodejs'],
        ]);

        new OtelAppender({
          ...validConfig,
          includeResources: ['service.name', 'service.type'],
          attributes: { 'service.name': 'serverless-kibana', 'service.type': 'kibana' },
        });

        // includeResources filters the detected resource — it does not skip detection.
        expect(mockDetectResources).toHaveBeenCalled();
        // Only the allowlisted keys survive.
        const filteredArg = mockResourceFromAttributes.mock.calls.at(-1)![0];
        expect(Object.keys(filteredArg).sort()).toEqual(['service.name', 'service.type']);
        expect(filteredArg['service.name']).toBe('serverless-kibana');
        expect(filteredArg['service.type']).toBe('kibana');
      });

      it('keeps the configured value on duplicate keys regardless of merge() ordering', () => {
        // The APM-derived service.name ('kibana') is deliberately placed FIRST in the raw entries —
        // i.e. as if merge() emitted the base before the override. config.attributes must still win,
        // because precedence is resolved from config.attributes, not from raw-entry position.
        wireResourceWithRawAttributes([
          ['service.name', 'kibana'],
          ['service.type', 'kibana'],
          ['service.name', 'serverless-kibana'],
        ]);

        new OtelAppender({
          ...validConfig,
          includeResources: ['service.name', 'service.type'],
          attributes: { 'service.name': 'serverless-kibana', 'service.type': 'kibana' },
        });

        const filteredArg = mockResourceFromAttributes.mock.calls.at(-1)![0];
        // The configured override wins even though the base value appears first in the raw entries.
        expect(filteredArg['service.name']).toBe('serverless-kibana');
        expect(filteredArg['service.type']).toBe('kibana');
      });

      it('lets an explicit allowlist govern the resource even when a key is also in fieldDrops', () => {
        wireResourceWithRawAttributes([
          ['service.name', 'serverless-kibana'],
          ['service.type', 'kibana'],
          ['host.name', 'my-host'],
        ]);

        new OtelAppender({
          ...validConfig,
          includeResources: ['service.name', 'service.type'],
          // service.type is also dropped from the per-record attributes, but the resource allowlist
          // keeps it in the resource (fieldDrops does not shape the resource when an allowlist is set).
          fieldDrops: ['service.type'],
        });

        const filteredArg = mockResourceFromAttributes.mock.calls.at(-1)![0];
        expect(Object.keys(filteredArg).sort()).toEqual(['service.name', 'service.type']);
      });

      it('does not rebuild the resource when includeResources defaults to all and no fieldDrops', () => {
        const resourceWithKnownRaw = wireResourceWithRawAttributes([['service.name', 'kibana']]);

        new OtelAppender(validConfig); // no includeResources, no fieldDrops

        // Fast path: the merged resource is used directly, with no getRawAttributes()-based rebuild.
        expect(resourceWithKnownRaw.getRawAttributes).not.toHaveBeenCalled();
      });
    });
  });

  describe('promoteResourceAttributes', () => {
    // Wire buildOtelResources().merge(...) to resolve to a resource whose getRawAttributes()
    // returns the given entries (mirrors the includeResources wiring above).
    const wireResource = (rawAttributes: Array<[string, unknown]>) => {
      const resourceWithKnownRaw = makeMockResource('known');
      (resourceWithKnownRaw.getRawAttributes as jest.Mock).mockReturnValue(rawAttributes);
      const r1 = makeMockResource('r1', {});
      r1.merge.mockReturnValueOnce(resourceWithKnownRaw);
      mockMergeResource.mockReturnValueOnce(r1);
    };

    it('promotes a resource attribute into per-record attributes', () => {
      wireResource([
        ['service.name', 'serverless-kibana'],
        ['project.id', 'proj-123'],
      ]);

      const appender = new OtelAppender({
        ...validConfig,
        promoteResourceAttributes: ['project.id'],
      });
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['project.id'], 'proj-123');
    });

    it('skips async (Promise) resource values', () => {
      wireResource([['host.id', Promise.resolve('async-host-id')]]);

      const appender = new OtelAppender({ ...validConfig, promoteResourceAttributes: ['host.id'] });
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['host.id']);
    });

    it('promotes nothing when the key is absent from the resource', () => {
      wireResource([['service.name', 'serverless-kibana']]);

      const appender = new OtelAppender({
        ...validConfig,
        promoteResourceAttributes: ['project.id'],
      });
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['project.id']);
    });

    it('promotes per-record even when includeResources strips it from the resource', () => {
      wireResource([
        ['service.name', 'serverless-kibana'],
        ['service.type', 'kibana'],
        ['project.id', 'proj-123'],
      ]);

      const appender = new OtelAppender({
        ...validConfig,
        includeResources: ['service.name', 'service.type'],
        promoteResourceAttributes: ['project.id'],
      });
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      // Per-record attributes carry project.id...
      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['project.id'], 'proj-123');
      // ...but the resource does not (the allowlist stripped it).
      const filteredResourceArg = mockResourceFromAttributes.mock.calls.at(-1)![0];
      expect(filteredResourceArg).not.toHaveProperty(['project.id']);
    });
  });

  describe('append() — severity mapping', () => {
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
    ])('emits records with filter-only level %s as severityNumber UNSPECIFIED', (_name, level) => {
      const appender = new OtelAppender(validConfig);
      appender.append(makeRecord({ level }));

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({ severityNumber: SeverityNumber.UNSPECIFIED })
      );
    });
  });

  describe('append() — body', () => {
    it('with pattern layout (default): passes the formatted string as body.text', () => {
      const appender = new OtelAppender(validConfig);
      mockLayoutFormat.mockReturnValue('hello world');
      const record = makeRecord({ message: 'hello world' });
      appender.append(record);

      expect(mockLayoutFormat).toHaveBeenCalledWith(record);
      // Formatted string is indexed as body.text, aliased to the ECS `message` field.
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ body: 'hello world' }));
    });

    it('with explicit pattern layout: passes the formatted string as body.text', () => {
      const appender = new OtelAppender({ ...validConfig, layout: { type: 'pattern' } });
      mockLayoutFormat.mockReturnValue('formatted: hello world');
      const record = makeRecord({ message: 'hello world' });
      appender.append(record);

      expect(mockLayoutFormat).toHaveBeenCalledWith(record);
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'formatted: hello world' })
      );
    });

    it('with JSON layout: passes a sanitised LogRecord as structured body - strips level and null fields', () => {
      const appender = new OtelAppender({ ...validConfig, layout: { type: 'json' } });
      // Simulate runtime null values that can appear for missing trace identifiers.
      const record = makeRecord({ message: 'hello world', spanId: null, traceId: null });
      appender.append(record as unknown as ReturnType<typeof makeRecord>);

      const { body } = mockEmit.mock.calls[0][0];
      // null fields are stripped to avoid empty entries in Elasticsearch
      expect(body).not.toHaveProperty('span');
      expect(body).not.toHaveProperty('trace');
      expect(body).not.toHaveProperty('transaction');
      expect(body).not.toHaveProperty('error');
      // non-null fields are preserved
      const {
        // Undefined fields are stripped
        span,
        trace: _trace,
        transaction: _transaction,
        error: _error,
        ...ecsRecord
      } = JsonLayout.ecsRecord(record);
      expect(body).toMatchObject(set(ecsRecord, 'process.uptime', expect.any(Number)));
      // The layout's format() method is NOT invoked for JSON layout
      expect(mockLayoutFormat).not.toHaveBeenCalled();
    });
  });

  describe('append() — trace context', () => {
    it('passes trace context via OTel context API when traceId and spanId are present', () => {
      const appender = new OtelAppender(validConfig);
      appender.append(makeRecord({ traceId: 'abc123', spanId: 'def456' }));

      expect(trace.setSpanContext).toHaveBeenCalledWith('root-context', {
        traceId: 'abc123',
        spanId: 'def456',
        traceFlags: 0, // TraceFlags.NONE
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

  describe('append() — attributes', () => {
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

    describe('log.meta', () => {
      it('with pattern layout (default): flattens meta fields into attributes', () => {
        const appender = new OtelAppender(validConfig);
        const meta = { http: { method: 'GET' }, tags: ['api'] };
        appender.append(makeRecord({ meta }));

        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({
              'http.method': 'GET',
              tags: ['api'],
            }),
          })
        );
      });

      it('with pattern layout: omits log.meta when meta is not present', () => {
        const appender = new OtelAppender(validConfig);
        appender.append(makeRecord());

        const { attributes } = mockEmit.mock.calls[0][0];
        expect(attributes).not.toHaveProperty('log.meta');
      });

      it('with JSON layout: does not include log.meta in attributes (meta is part of the structured body)', () => {
        const appender = new OtelAppender({ ...validConfig, layout: { type: 'json' } });
        const meta = { http: { method: 'GET' }, tags: ['api'] };
        appender.append(makeRecord({ meta }));

        const { attributes } = mockEmit.mock.calls[0][0];
        expect(attributes).not.toHaveProperty('log.meta');
      });
    });

    describe('fieldRenames', () => {
      // toHaveProperty('a.b') traverses nested objects; use array form (['a.b']) for flat dotted keys.

      it('renames a meta attribute to the specified target key', () => {
        const appender = new OtelAppender({
          ...validConfig,
          fieldRenames: { 'kibana.space_id': 'kibana.space.id' },
        });
        appender.append(makeRecord({ meta: { kibana: { space_id: 'default' } } }));

        const { attributes } = mockEmit.mock.calls[0][0];
        expect(attributes).toHaveProperty(['kibana.space.id'], 'default');
        expect(attributes).not.toHaveProperty(['kibana.space_id']);
      });

      it('fans out a single source key to multiple target keys and removes the original', () => {
        const appender = new OtelAppender({
          ...validConfig,
          fieldRenames: { 'client.ip': ['source.address', 'source.ip'] },
        });
        appender.append(makeRecord({ meta: { client: { ip: '1.2.3.4' } } }));

        const { attributes } = mockEmit.mock.calls[0][0];
        expect(attributes).toHaveProperty(['source.address'], '1.2.3.4');
        expect(attributes).toHaveProperty(['source.ip'], '1.2.3.4');
        expect(attributes).not.toHaveProperty(['client.ip']);
      });

      it('is a no-op when the source key is absent from the record', () => {
        const appender = new OtelAppender({
          ...validConfig,
          fieldRenames: { 'kibana.space_id': 'kibana.space.id' },
        });
        appender.append(makeRecord({ meta: { other: 'value' } }));

        const { attributes } = mockEmit.mock.calls[0][0];
        expect(attributes).not.toHaveProperty(['kibana.space.id']);
        expect(attributes).not.toHaveProperty(['kibana.space_id']);
      });

      it('leaves attributes unchanged when fieldRenames is not configured', () => {
        const appender = new OtelAppender(validConfig);
        appender.append(makeRecord({ meta: { kibana: { space_id: 'default' } } }));

        const { attributes } = mockEmit.mock.calls[0][0];
        expect(attributes).toHaveProperty(['kibana.space_id'], 'default');
        expect(attributes).not.toHaveProperty(['kibana.space.id']);
      });

      it('applies multiple renames — including a fan-out — in a single pass', () => {
        // Generic coverage of the rename mechanism (single-target, dotted-path, and array
        // fan-out). The audit-specific rename set is asserted in audit_service.test.ts; this
        // test intentionally uses neutral example keys and must not mirror those constants.
        const appender = new OtelAppender({
          ...validConfig,
          fieldRenames: {
            'a.old': 'a.new',
            'nested.old_key': 'nested.new.key',
            'fanout.source': ['fanout.target_one', 'fanout.target_two'],
          },
        });
        appender.append(
          makeRecord({
            meta: {
              a: { old: 'value-a' },
              nested: { old_key: 'value-nested' },
              fanout: { source: 'value-fanout' },
            },
          })
        );

        const { attributes } = mockEmit.mock.calls[0][0];
        // Renamed keys present with correct values
        expect(attributes).toHaveProperty(['a.new'], 'value-a');
        expect(attributes).toHaveProperty(['nested.new.key'], 'value-nested');
        // Fan-out: value copied to every target
        expect(attributes).toHaveProperty(['fanout.target_one'], 'value-fanout');
        expect(attributes).toHaveProperty(['fanout.target_two'], 'value-fanout');
        // Original keys removed
        expect(attributes).not.toHaveProperty(['a.old']);
        expect(attributes).not.toHaveProperty(['nested.old_key']);
        expect(attributes).not.toHaveProperty(['fanout.source']);
      });
    });
  });

  describe('fieldDrops', () => {
    it('removes specified keys from log record attributes', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldDrops: ['service.version', 'kibana.space_id'],
      });
      appender.append(
        makeRecord({ meta: { kibana: { space_id: 'default' }, service: { version: '9.0.0' } } })
      );

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['service.version']);
      expect(attributes).not.toHaveProperty(['kibana.space_id']);
    });

    it('is a no-op when the key is absent from the record', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldDrops: ['nonexistent.key'],
      });
      appender.append(makeRecord({ meta: { kibana: { space_id: 'default' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['kibana.space_id'], 'default');
    });

    it('leaves attributes unchanged when fieldDrops is not configured', () => {
      const appender = new OtelAppender(validConfig);
      appender.append(makeRecord({ meta: { service: { version: '9.0.0' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['service.version'], '9.0.0');
    });

    it('rebuilds the resource via getRawAttributes() when fieldDrops is set, excluding dropped keys and preserving async entries', () => {
      // Set up a resource with known raw attributes including an async (Promise) entry
      // to verify the rebuild uses getRawAttributes() — not the synchronous .attributes
      // snapshot — so async-detected attrs (e.g. host.id from getMachineId) are preserved.
      const asyncEntry = Promise.resolve('node-id');
      const resourceWithKnownRaw = makeMockResource('known', {
        'service.name': 'kibana',
        'host.name': 'my-host',
        'service.version': '9.0.0',
      });
      (resourceWithKnownRaw.getRawAttributes as jest.Mock).mockReturnValue([
        ['service.name', 'kibana'],
        ['host.name', 'my-host'],
        ['service.version', '9.0.0'],
        ['host.id', asyncEntry],
      ]);

      // Wire the mock chain: mockMergeResource (inside buildOtelResources) returns r1,
      // whose .merge() (called by the OtelAppender constructor) returns the resource above.
      const r1 = makeMockResource('r1', {});
      r1.merge.mockReturnValueOnce(resourceWithKnownRaw);
      mockMergeResource.mockReturnValueOnce(r1);

      new OtelAppender({ ...validConfig, fieldDrops: ['host.name', 'service.version'] });

      const filteredArg = mockResourceFromAttributes.mock.calls.at(-1)![0];
      // Dropped keys must be absent from the rebuilt resource
      expect(filteredArg).not.toHaveProperty(['host.name']);
      expect(filteredArg).not.toHaveProperty(['service.version']);
      // Non-dropped sync key is preserved
      expect(filteredArg).toHaveProperty(['service.name'], 'kibana');
      // Async entry is passed through as-is so the SDK can await it at export time
      expect(filteredArg['host.id']).toBe(asyncEntry);
    });
  });

  describe('fieldDefaults', () => {
    it('fills in a missing key with the default value', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldDefaults: { 'event.type': ['access'] },
      });
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['event.type'], ['access']);
    });

    it('does not override an existing value', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldDefaults: { 'event.type': ['access'] },
      });
      appender.append(
        makeRecord({ meta: { event: { type: ['creation'], action: 'saved_object_create' } } })
      );

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['event.type'], ['creation']);
    });

    it('leaves attributes unchanged when fieldDefaults is not configured', () => {
      const appender = new OtelAppender(validConfig);
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['event.type']);
    });
  });

  describe('fieldUppercase', () => {
    it('uppercases a string attribute value', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldUppercase: ['http.request.method'],
      });
      appender.append(makeRecord({ meta: { http: { request: { method: 'get' } } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['http.request.method'], 'GET');
    });

    it('silently skips non-string values', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldUppercase: ['event.category'],
      });
      appender.append(makeRecord({ meta: { event: { category: ['web'] } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      // Array value is untouched.
      expect(attributes).toHaveProperty(['event.category'], ['web']);
    });

    it('silently skips absent keys', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldUppercase: ['http.request.method'],
      });
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['http.request.method']);
    });

    it('leaves attributes unchanged when fieldUppercase is not configured', () => {
      const appender = new OtelAppender(validConfig);
      appender.append(makeRecord({ meta: { http: { request: { method: 'get' } } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['http.request.method'], 'get');
    });
  });

  describe('fieldAdditions', () => {
    it('builds a value from a template referencing other flattened attributes', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldAdditions: { 'url.original': '{url.scheme}://{url.domain}{url.path}' },
      });
      appender.append(
        makeRecord({
          meta: { url: { scheme: 'http', domain: 'localhost', path: '/api/status' } },
        })
      );

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).toHaveProperty(['url.original'], 'http://localhost/api/status');
    });

    it('runs before fieldDrops: can reference fields that are then dropped', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldAdditions: { 'url.original': '{url.scheme}://{url.domain}{url.path}' },
        fieldDrops: ['url.scheme', 'url.domain', 'url.path'],
      });
      appender.append(
        makeRecord({
          meta: { url: { scheme: 'http', domain: 'localhost', path: '/api/status' } },
        })
      );

      const { attributes } = mockEmit.mock.calls[0][0];
      // Derived value survives; the source components are gone.
      expect(attributes).toHaveProperty(['url.original'], 'http://localhost/api/status');
      expect(attributes).not.toHaveProperty(['url.scheme']);
      expect(attributes).not.toHaveProperty(['url.domain']);
      expect(attributes).not.toHaveProperty(['url.path']);
    });

    it('skips the addition when any referenced field is missing', () => {
      const appender = new OtelAppender({
        ...validConfig,
        fieldAdditions: { 'url.original': '{url.scheme}://{url.domain}{url.path}' },
      });
      // Non-http event: no url.* fields at all.
      appender.append(makeRecord({ meta: { event: { action: 'user_login' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['url.original']);
    });

    it('leaves attributes unchanged when fieldAdditions is not configured', () => {
      const appender = new OtelAppender(validConfig);
      appender.append(
        makeRecord({ meta: { url: { scheme: 'http', domain: 'localhost', path: '/api/status' } } })
      );

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['url.original']);
    });

    it('skips the addition when a referenced field is array-valued (no silent comma-join)', () => {
      const appender = new OtelAppender({
        ...validConfig,
        // event.category is an array; a template must not stringify it into a degenerate value.
        fieldAdditions: { 'derived.field': 'prefix-{event.category}' },
      });
      appender.append(makeRecord({ meta: { event: { category: ['authentication', 'web'] } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      expect(attributes).not.toHaveProperty(['derived.field']);
      // The array-valued source itself is untouched.
      expect(attributes).toHaveProperty(['event.category'], ['authentication', 'web']);
    });
  });

  describe('ordering: rename → additions → drop → defaults', () => {
    it('drop is a no-op when the key was already renamed away', () => {
      // fieldRenames runs before fieldDrops: the old key is gone before the drop runs.
      const appender = new OtelAppender({
        ...validConfig,
        fieldRenames: { 'kibana.space_id': 'kibana.space.id' },
        fieldDrops: ['kibana.space_id'],
      });
      appender.append(makeRecord({ meta: { kibana: { space_id: 'default' } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      // Rename succeeded; drop had no target left.
      expect(attributes).toHaveProperty(['kibana.space.id'], 'default');
      expect(attributes).not.toHaveProperty(['kibana.space_id']);
    });

    it('default fills in a key that was dropped', () => {
      // fieldDrops runs before fieldDefaults: drop removes the key, default re-adds it.
      const appender = new OtelAppender({
        ...validConfig,
        fieldDrops: ['event.type'],
        fieldDefaults: { 'event.type': ['access'] },
      });
      appender.append(makeRecord({ meta: { event: { type: ['creation'] } } }));

      const { attributes } = mockEmit.mock.calls[0][0];
      // Original value was dropped; default filled in the gap.
      expect(attributes).toHaveProperty(['event.type'], ['access']);
    });
  });

  describe('dispose()', () => {
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

    it('does not produce an unhandled rejection when shutdown rejects after the timeout', async () => {
      jest.useFakeTimers();
      let rejectShutdown!: (err: Error) => void;
      mockShutdown.mockReturnValue(
        new Promise<void>((_, rej) => {
          rejectShutdown = rej;
        })
      );
      const appender = new OtelAppender(validConfig);

      const disposePromise = appender.dispose();
      jest.runAllTimers();
      await expect(disposePromise).resolves.toBeUndefined();

      // Rejecting the shutdown promise after dispose() has already returned should not
      // surface as an unhandled rejection because .catch(() => {}) is attached.
      expect(() => rejectShutdown(new Error('late shutdown failure'))).not.toThrow();

      jest.useRealTimers();
    });
  });
});
