/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { Server, ServerCredentials, status } from '@grpc/grpc-js';
import { metrics } from '@opentelemetry/api';
import { metrics as sdkMetrics } from '@elastic/opentelemetry-node/sdk';
import { LogLevel } from '@kbn/logging';
import { OtelAppender } from './otel_appender';

class TestMetricReader extends sdkMetrics.MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}

const passThrough = (buffer: Buffer): Buffer => buffer;

/** An in-process OTLP gRPC logs collector that rejects the first `failures` exports as UNAVAILABLE. */
const startCollector = async (failures: number) => {
  let exportCalls = 0;
  const server = new Server();
  server.addService(
    {
      Export: {
        path: '/opentelemetry.proto.collector.logs.v1.LogsService/Export',
        requestStream: false,
        responseStream: false,
        requestSerialize: passThrough,
        requestDeserialize: passThrough,
        responseSerialize: passThrough,
        responseDeserialize: passThrough,
      },
    },
    {
      Export: (_call: unknown, callback: (error: object | null, response?: Buffer) => void) => {
        exportCalls++;
        if (exportCalls <= failures) {
          callback({ code: status.UNAVAILABLE, details: 'collector unavailable' });
          return;
        }
        // An empty buffer is a valid, empty ExportLogsServiceResponse.
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
    getExportCalls: () => exportCalls,
    stop: () => server.forceShutdown(),
  };
};

const makeRecord = (message: string) => ({
  context: 'test.context',
  level: LogLevel.Info,
  message,
  timestamp: new Date('2024-01-01T00:00:00Z'),
  pid: 1234,
});

describe('OtelAppender exporter self-observability metrics with the retry layer', () => {
  let reader: TestMetricReader;
  let collector: Awaited<ReturnType<typeof startCollector>> | undefined;

  const collectMetric = async (name: string) => {
    const { resourceMetrics } = await reader.collect();
    return resourceMetrics.scopeMetrics
      .flatMap(({ metrics: scopeMetrics }) => scopeMetrics)
      .filter(({ descriptor }) => descriptor.name === name)
      .flatMap<sdkMetrics.DataPoint<unknown>>(({ dataPoints }) => dataPoints)
      .map(({ attributes, value }) => ({ attributes, value }));
  };

  const exportThroughAppender = async (maxElapsedTime: moment.Duration) => {
    const appender = new OtelAppender({
      type: 'otel',
      protocol: 'grpc',
      url: collector!.url,
      headers: {},
      maxElapsedTime,
    });
    appender.append(makeRecord('first'));
    appender.append(makeRecord('second'));
    await appender.dispose();
  };

  beforeEach(() => {
    // Pin jitter to its midpoint so the backoff sequence is exactly 1000, 1500, ... ms.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    reader = new TestMetricReader();
    metrics.setGlobalMeterProvider(new sdkMetrics.MeterProvider({ readers: [reader] }));
  });

  afterEach(() => {
    collector?.stop();
    collector = undefined;
    metrics.disable();
    jest.restoreAllMocks();
  });

  it('counts a batch once, as exported, when it succeeds after a retried failure', async () => {
    collector = await startCollector(1);

    await exportThroughAppender(moment.duration(1, 'minute'));

    expect(collector.getExportCalls()).toBe(2);
    expect(await collectMetric('otel.sdk.exporter.log.exported')).toEqual([
      {
        value: 2,
        attributes: expect.not.objectContaining({ 'error.type': expect.anything() }),
      },
    ]);
    const durations = await collectMetric('otel.sdk.exporter.operation.duration');
    expect(durations).toEqual([
      {
        value: expect.objectContaining({ count: 1 }),
        attributes: expect.objectContaining({ 'rpc.response.status_code': 'OK' }),
      },
    ]);
  });

  it('counts a batch once, as failed, when the retry budget runs out', async () => {
    collector = await startCollector(Infinity);

    // 2s budget: attempts at t=0 and t=1000; the next backoff (1500ms) would pass the deadline.
    await exportThroughAppender(moment.duration(2, 'seconds'));

    expect(collector.getExportCalls()).toBe(2);
    expect(await collectMetric('otel.sdk.exporter.log.exported')).toEqual([
      { value: 2, attributes: expect.objectContaining({ 'error.type': expect.any(String) }) },
    ]);
    expect(await collectMetric('otel.sdk.exporter.operation.duration')).toEqual([
      {
        value: expect.objectContaining({ count: 1 }),
        attributes: expect.objectContaining({ 'rpc.response.status_code': 'UNAVAILABLE' }),
      },
    ]);
  });
});
