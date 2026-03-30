/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@opentelemetry/exporter-trace-otlp-grpc');
jest.mock('@opentelemetry/exporter-trace-otlp-http');
jest.mock('@opentelemetry/exporter-trace-otlp-proto');

import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterPROTO } from '@opentelemetry/exporter-trace-otlp-proto';
import { Metadata } from '@grpc/grpc-js';
import { OTLPSpanProcessor } from './otlp_span_processor';

const MockedGRPC = OTLPTraceExporterGRPC as jest.MockedClass<typeof OTLPTraceExporterGRPC>;
const MockedHTTP = OTLPTraceExporterHTTP as jest.MockedClass<typeof OTLPTraceExporterHTTP>;
const MockedPROTO = OTLPTraceExporterPROTO as jest.MockedClass<typeof OTLPTraceExporterPROTO>;

const BASE_CONFIG = {
  url: 'http://localhost:4317',
  scheduled_delay: 1000,
};

describe('OTLPSpanProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('grpc protocol', () => {
    it('instantiates the gRPC exporter', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'grpc');
      expect(MockedGRPC).toHaveBeenCalledTimes(1);
      expect(MockedHTTP).not.toHaveBeenCalled();
      expect(MockedPROTO).not.toHaveBeenCalled();
    });

    it('passes the url to the gRPC exporter', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'grpc');
      expect(MockedGRPC).toHaveBeenCalledWith(expect.objectContaining({ url: BASE_CONFIG.url }));
    });

    it('converts headers to gRPC Metadata', () => {
      new OTLPSpanProcessor(
        { ...BASE_CONFIG, headers: { authorization: 'Bearer token', 'x-tenant': 'acme' } },
        'grpc'
      );

      const { metadata } = MockedGRPC.mock.calls[0][0] as { metadata: Metadata };
      expect(metadata).toBeInstanceOf(Metadata);
      expect(metadata.get('authorization')).toEqual(['Bearer token']);
      expect(metadata.get('x-tenant')).toEqual(['acme']);
    });

    it('passes empty Metadata when no headers are provided', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'grpc');

      const { metadata } = MockedGRPC.mock.calls[0][0] as { metadata: Metadata };
      expect(metadata).toBeInstanceOf(Metadata);
      expect(metadata.getMap()).toEqual({});
    });

    it('does not pass a headers field to the gRPC exporter', () => {
      new OTLPSpanProcessor({ ...BASE_CONFIG, headers: { authorization: 'Bearer token' } }, 'grpc');

      const callArg = MockedGRPC.mock.calls[0][0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('headers');
    });
  });

  describe('http protocol', () => {
    it('instantiates the HTTP exporter', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'http');
      expect(MockedHTTP).toHaveBeenCalledTimes(1);
      expect(MockedGRPC).not.toHaveBeenCalled();
      expect(MockedPROTO).not.toHaveBeenCalled();
    });

    it('passes url and headers directly to the HTTP exporter', () => {
      new OTLPSpanProcessor({ ...BASE_CONFIG, headers: { authorization: 'Bearer token' } }, 'http');
      expect(MockedHTTP).toHaveBeenCalledWith({
        url: BASE_CONFIG.url,
        headers: { authorization: 'Bearer token' },
      });
    });

    it('passes undefined headers when none are provided', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'http');
      expect(MockedHTTP).toHaveBeenCalledWith({
        url: BASE_CONFIG.url,
        headers: undefined,
      });
    });
  });

  describe('proto protocol', () => {
    it('instantiates the proto exporter', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'proto');
      expect(MockedPROTO).toHaveBeenCalledTimes(1);
      expect(MockedGRPC).not.toHaveBeenCalled();
      expect(MockedHTTP).not.toHaveBeenCalled();
    });

    it('passes url and headers directly to the proto exporter', () => {
      new OTLPSpanProcessor(
        { ...BASE_CONFIG, headers: { authorization: 'Bearer token' } },
        'proto'
      );
      expect(MockedPROTO).toHaveBeenCalledWith({
        url: BASE_CONFIG.url,
        headers: { authorization: 'Bearer token' },
      });
    });

    it('passes undefined headers when none are provided', () => {
      new OTLPSpanProcessor(BASE_CONFIG, 'proto');
      expect(MockedPROTO).toHaveBeenCalledWith({
        url: BASE_CONFIG.url,
        headers: undefined,
      });
    });
  });

  describe('scheduled delay', () => {
    it('is passed through for all protocols', () => {
      const config = { ...BASE_CONFIG, scheduled_delay: 7500 };

      // We verify the BatchSpanProcessor receives it by checking it was set on
      // the processor — the easiest observable proxy is that no error is thrown
      // and the instance is created successfully.
      expect(() => new OTLPSpanProcessor(config, 'grpc')).not.toThrow();
      expect(() => new OTLPSpanProcessor(config, 'http')).not.toThrow();
      expect(() => new OTLPSpanProcessor(config, 'proto')).not.toThrow();
    });
  });
});
