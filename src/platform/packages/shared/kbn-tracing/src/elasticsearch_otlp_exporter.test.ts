/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { Readable } from 'node:stream';
import { core } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';
import { ElasticsearchOtlpExporter } from './elasticsearch_otlp_exporter';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

vi.mock('@opentelemetry/otlp-transformer', () => {
      const mocked = {
      ProtobufTraceSerializer: {
        serializeRequest: vi.fn(),
        deserializeResponse: vi.fn(),
      },
    };
      return { ...mocked, default: mocked };
    });

const mockedSerializeRequest = ProtobufTraceSerializer.serializeRequest as MockedFunction<
  typeof ProtobufTraceSerializer.serializeRequest
>;
const mockedDeserializeResponse =
  ProtobufTraceSerializer.deserializeResponse as MockedFunction<
    typeof ProtobufTraceSerializer.deserializeResponse
  >;

const emptyStream = (): Readable => Readable.from([]);
const streamFrom = (buf: Buffer): Readable => Readable.from([buf]);

describe('ElasticsearchOtlpExporter', () => {
  const spans = [] as tracing.ReadableSpan[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeserializeResponse.mockReturnValue({});
  });

  it('calls transport.request with correct path, method, headers, and asStream on success', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          const serialized = new Uint8Array([1, 2, 3]);
          mockedSerializeRequest.mockReturnValue(serialized);

          const request = vi.fn().mockResolvedValue(emptyStream());
          const client = {
            transport: { request },
          } as unknown as ElasticsearchClient;

          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.export(spans, (result) => {
            try {
              expect(result.code).toBe(core.ExportResultCode.SUCCESS);
              expect(request).toHaveBeenCalledWith(
                {
                  method: 'POST',
                  path: '/_otlp/v1/traces',
                  body: Buffer.from(serialized),
                },
                {
                  headers: { 'Content-Type': 'application/x-protobuf' },
                  maxRetries: 3,
                  asStream: true,
                }
              );
              done();
            } catch (err) {
              done(err);
            }
          });
        
      }));

  it('returns FAILED when serialization fails', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          mockedSerializeRequest.mockImplementation(() => undefined);

          const request = vi.fn();
          const client = {
            transport: { request },
          } as unknown as ElasticsearchClient;

          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.export(spans, (result) => {
            try {
              expect(result.code).toBe(core.ExportResultCode.FAILED);
              expect(result.error).toEqual(new Error('Serialization failed'));
              expect(request).not.toHaveBeenCalled();
              done();
            } catch (err) {
              done(err);
            }
          });
        
      }));

  it('returns FAILED when transport.request rejects', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          const serialized = new Uint8Array([9]);
          mockedSerializeRequest.mockReturnValue(serialized);

          const transportError = new Error('connection reset');
          const request = vi.fn().mockRejectedValue(transportError);
          const client = {
            transport: { request },
          } as unknown as ElasticsearchClient;

          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.export(spans, (result) => {
            try {
              expect(result.code).toBe(core.ExportResultCode.FAILED);
              expect(result.error).toBe(transportError);
              done();
            } catch (err) {
              done(err);
            }
          });
        
      }));

  it('returns FAILED when OTLP response contains a partial failure', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          const serialized = new Uint8Array([1, 2, 3]);
          mockedSerializeRequest.mockReturnValue(serialized);

          const protobufBytes = Buffer.from([0x0a, 0x05]);
          const request = vi.fn().mockResolvedValue(streamFrom(protobufBytes));
          const client = {
            transport: { request },
          } as unknown as ElasticsearchClient;

          const errorMessage =
            'action [indices:data/write/bulk[s]] is unauthorized for user [kibana_system]';
          mockedDeserializeResponse.mockReturnValue({
            partialSuccess: { rejectedSpans: 3, errorMessage },
          });

          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.export(spans, (result) => {
            try {
              expect(result.code).toBe(core.ExportResultCode.FAILED);
              expect(result.error?.message).toBe(errorMessage);
              expect(mockedDeserializeResponse).toHaveBeenCalledWith(protobufBytes);
              done();
            } catch (err) {
              done(err);
            }
          });
        
      }));

  it('returns SUCCESS when OTLP response has no partial failure', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          const serialized = new Uint8Array([1, 2, 3]);
          mockedSerializeRequest.mockReturnValue(serialized);

          const protobufBytes = Buffer.from([0x0a, 0x00]);
          const request = vi.fn().mockResolvedValue(streamFrom(protobufBytes));
          const client = {
            transport: { request },
          } as unknown as ElasticsearchClient;

          mockedDeserializeResponse.mockReturnValue({});

          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.export(spans, (result) => {
            try {
              expect(result.code).toBe(core.ExportResultCode.SUCCESS);
              done();
            } catch (err) {
              done(err);
            }
          });
        
      }));

  it('treats empty response body as success', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          const serialized = new Uint8Array([1, 2, 3]);
          mockedSerializeRequest.mockReturnValue(serialized);

          const request = vi.fn().mockResolvedValue(emptyStream());
          const client = {
            transport: { request },
          } as unknown as ElasticsearchClient;

          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.export(spans, (result) => {
            try {
              expect(result.code).toBe(core.ExportResultCode.SUCCESS);
              expect(mockedDeserializeResponse).not.toHaveBeenCalled();
              done();
            } catch (err) {
              done(err);
            }
          });
        
      }));

  it('shutdown waits for in-flight exports to complete before returning', async () => {
    const serialized = new Uint8Array([1, 2, 3]);
    mockedSerializeRequest.mockReturnValue(serialized);

    const request = vi.fn().mockResolvedValue(emptyStream());
    const client = {
      transport: { request },
    } as unknown as ElasticsearchClient;

    const exporter = new ElasticsearchOtlpExporter(client);
    const results: core.ExportResult[] = [];
    exporter.export(spans, (result) => results.push(result));

    await exporter.shutdown();

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe(core.ExportResultCode.SUCCESS);
  });

  it('export after shutdown returns FAILED immediately', () =>
      new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

          const client = {
            transport: { request: vi.fn() },
          } as unknown as ElasticsearchClient;
          const exporter = new ElasticsearchOtlpExporter(client);

          exporter.shutdown().then(() => {
            exporter.export(spans, (result) => {
              try {
                expect(result.code).toBe(core.ExportResultCode.FAILED);
                expect(result.error?.message).toBe('Exporter has been shut down');
                expect(client.transport.request).not.toHaveBeenCalled();
                done();
              } catch (err) {
                done(err);
              }
            });
          });
        
      }));

  it('forceFlush waits for in-flight exports', async () => {
    const serialized = new Uint8Array([4, 5]);
    mockedSerializeRequest.mockReturnValue(serialized);

    let resolveRequest: (value: unknown) => void;
    const request = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    const client = {
      transport: { request },
    } as unknown as ElasticsearchClient;

    const exporter = new ElasticsearchOtlpExporter(client);
    const results: core.ExportResult[] = [];
    exporter.export(spans, (result) => results.push(result));

    const flushPromise = exporter.forceFlush();

    expect(results).toHaveLength(0);
    resolveRequest!(emptyStream());
    await flushPromise;

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe(core.ExportResultCode.SUCCESS);
  });

  it('forceFlush resolves immediately when no exports are pending', async () => {
    const client = {
      transport: { request: vi.fn() },
    } as unknown as ElasticsearchClient;
    const exporter = new ElasticsearchOtlpExporter(client);

    await expect(exporter.forceFlush()).resolves.toBeUndefined();
  });
});
