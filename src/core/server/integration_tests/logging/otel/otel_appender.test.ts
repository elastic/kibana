/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * End-to-end coverage for the otel appender's retry budget (`maxElapsedTime`) and bounded
 * queue (`maxQueueSize`) against the REAL OTel SDK pipeline (BatchLogRecordProcessor +
 * OTLPLogExporter) and an in-process collector — nothing mocked. The unit tests mock the
 * SDK, so they cannot catch drift in the SDK error shapes that the retry layer's
 * transient-failure classification depends on; this suite exists to catch exactly that,
 * e.g. on OTel SDK upgrades.
 *
 * The gRPC transport is used because the SDK's HTTP transport loads `http`/`https` via
 * dynamic `import()`, which jest's VM sandbox does not support. gRPC is also the transport
 * where the retry layer matters most: the JS SDK has NO built-in retry for gRPC exports, so
 * the classification of gRPC statuses (UNAVAILABLE etc.) below is exercised for real here.
 * gRPC replies also carry no inner SDK retries, so every request the collector sees maps
 * 1:1 to one attempt by the retry layer, making the assertions exact.
 */

import { Server, ServerCredentials, status as grpcStatus } from '@grpc/grpc-js';
import { setTimeout as timer } from 'timers/promises';
import { config as loggingConfig, LoggingSystem } from '@kbn/core-logging-server-internal';

jest.setTimeout(60_000);

type CollectorMode = 'ok' | 'unavailable' | 'unauthenticated';

interface Collector {
  url: string;
  setMode: (mode: CollectorMode) => void;
  /** Number of export requests received per mode. */
  requestCounts: () => Record<CollectorMode, number>;
  /** How many times `needle` occurs across all accepted export payloads. */
  countReceived: (needle: string) => number;
  close: () => void;
}

/**
 * A minimal in-process OTLP/gRPC logs collector. Export payloads are kept as raw protobuf
 * buffers; since protobuf encodes strings as plain UTF-8, log messages can be asserted on
 * by searching the payload bytes for marker strings.
 */
const startCollector = async (): Promise<Collector> => {
  let mode: CollectorMode = 'ok';
  const counts: Record<CollectorMode, number> = { ok: 0, unavailable: 0, unauthenticated: 0 };
  const payloads: Buffer[] = [];

  const passthrough = (buffer: Buffer) => buffer;
  const server = new Server();
  server.addService(
    {
      export: {
        path: '/opentelemetry.proto.collector.logs.v1.LogsService/Export',
        requestStream: false,
        responseStream: false,
        requestSerialize: passthrough,
        requestDeserialize: passthrough,
        responseSerialize: passthrough,
        responseDeserialize: passthrough,
      },
    },
    {
      export: (
        call: { request: Buffer },
        callback: (error: { code: number } | null, response?: Buffer) => void
      ) => {
        counts[mode]++;
        if (mode === 'unavailable') {
          callback({ code: grpcStatus.UNAVAILABLE });
          return;
        }
        if (mode === 'unauthenticated') {
          callback({ code: grpcStatus.UNAUTHENTICATED });
          return;
        }
        payloads.push(call.request);
        // An empty buffer is a valid (empty) ExportLogsServiceResponse.
        callback(null, Buffer.alloc(0));
      },
    }
  );

  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, boundPort) =>
      error ? reject(error) : resolve(boundPort)
    );
  });

  return {
    url: `http://127.0.0.1:${port}`,
    setMode: (next) => {
      mode = next;
    },
    requestCounts: () => ({ ...counts }),
    countReceived: (needle) => {
      const needleBuffer = Buffer.from(needle);
      let total = 0;
      for (const payload of payloads) {
        let offset = 0;
        while ((offset = payload.indexOf(needleBuffer, offset)) !== -1) {
          total++;
          offset += needleBuffer.length;
        }
      }
      return total;
    },
    close: () => server.forceShutdown(),
  };
};

/** Polls until `condition` is true; throws after `timeoutMs`. */
const waitFor = async (condition: () => boolean, timeoutMs = 20_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    }
    await timer(100);
  }
};

/**
 * Builds a logging system whose root logger ships to the collector through a real otel
 * appender. The config goes through the real YAML schema with the serverless context, so
 * this also exercises the offering-gated options end to end.
 */
const startLoggingSystem = async (
  collectorUrl: string,
  overrides: { maxElapsedTime?: string; maxQueueSize?: number } = {}
) => {
  const validated = loggingConfig.schema.validate(
    {
      appenders: {
        otel: { type: 'otel', protocol: 'grpc', url: collectorUrl, ...overrides },
      },
      root: { appenders: ['otel'], level: 'info' },
    },
    { serverless: true }
  );
  const system = new LoggingSystem();
  await system.upgrade(validated);
  return system;
};

describe('OtelAppender (real OTel SDK)', () => {
  let collector: Collector;
  let system: LoggingSystem | undefined;

  beforeEach(async () => {
    collector = await startCollector();
  });

  afterEach(async () => {
    await system?.stop();
    system = undefined;
    collector.close();
  });

  it('delivers records buffered while the collector was failing (retry budget)', async () => {
    collector.setMode('unavailable');
    system = await startLoggingSystem(collector.url, { maxElapsedTime: '15s' });

    system.get('test').info('marker-buffered');

    // Every request is one attempt by the retry layer (no inner SDK retry over gRPC), so
    // two rejected requests prove the export outlived the plain SDK behavior of failing
    // the batch on the first UNAVAILABLE response.
    await waitFor(() => collector.requestCounts().unavailable >= 2);
    expect(collector.countReceived('marker-buffered')).toBe(0);

    collector.setMode('ok');
    await waitFor(() => collector.countReceived('marker-buffered') === 1);
  });

  it('drops the batch once maxElapsedTime is exhausted, then resumes with new records', async () => {
    collector.setMode('unavailable');
    system = await startLoggingSystem(collector.url, { maxElapsedTime: '2s' });

    system.get('test').info('marker-dropped');

    // First export starts ~1s after the emit (batch delay) and its 2s budget expires ~3s
    // later; by t=6s the batch must have been dropped.
    await timer(6_000);

    collector.setMode('ok');
    system.get('test').info('marker-after-recovery');
    await waitFor(() => collector.countReceived('marker-after-recovery') === 1);

    // The dropped record must never arrive, even though the collector recovered.
    expect(collector.countReceived('marker-dropped')).toBe(0);
  });

  it('does not retry non-transient failures (UNAUTHENTICATED)', async () => {
    collector.setMode('unauthenticated');
    system = await startLoggingSystem(collector.url, { maxElapsedTime: '15s' });

    system.get('test').info('marker-unauthorized');

    await waitFor(() => collector.requestCounts().unauthenticated >= 1);
    await timer(3_000);
    // Exactly one attempt: UNAUTHENTICATED is not transient, so the retry layer gives up
    // immediately instead of burning the 15s budget.
    expect(collector.requestCounts().unauthenticated).toBe(1);

    collector.setMode('ok');
    system.get('test').info('marker-after-auth-failure');
    await waitFor(() => collector.countReceived('marker-after-auth-failure') === 1);
    expect(collector.countReceived('marker-unauthorized')).toBe(0);
  });

  it('bounds the in-memory queue at maxQueueSize during an outage, dropping overflow', async () => {
    collector.setMode('unavailable');
    system = await startLoggingSystem(collector.url, {
      maxQueueSize: 512,
      maxElapsedTime: '15s',
    });
    const logger = system.get('test');

    // Get one batch in-flight and stuck retrying: while an export is in progress, the
    // processor only queues new records (it never starts a concurrent export), which is the
    // only situation in which the queue can actually overflow.
    logger.info('marker-first');
    await waitFor(() => collector.requestCounts().unavailable >= 1);

    // Emitted synchronously while the first batch retries: 0..511 fill the queue, 512..599
    // overflow and are dropped by the processor.
    for (let i = 0; i < 600; i++) {
      logger.info(`marker-queue-${i}.`);
    }

    collector.setMode('ok');
    // Recovery: the retrying batch is delivered first, then the queued 512.
    await waitFor(() => collector.countReceived('marker-queue-') >= 512);
    // Give any (unexpected) extra batch a chance to arrive before asserting the bound.
    await timer(2_000);

    expect(collector.countReceived('marker-first')).toBe(1);
    expect(collector.countReceived('marker-queue-')).toBe(512);
    // The trailing '.' makes markers prefix-free (marker-queue-5 vs marker-queue-51).
    expect(collector.countReceived('marker-queue-0.')).toBe(1);
    expect(collector.countReceived('marker-queue-511.')).toBe(1);
    expect(collector.countReceived('marker-queue-512.')).toBe(0);
    expect(collector.countReceived('marker-queue-599.')).toBe(0);
  });
});
