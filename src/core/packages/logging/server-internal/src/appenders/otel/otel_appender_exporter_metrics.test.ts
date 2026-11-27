/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { omit } from 'lodash';
import moment from 'moment';
import { Server, ServerCredentials, status } from '@grpc/grpc-js';
import { metrics, type Attributes } from '@opentelemetry/api';
import { MeterProvider, MetricReader, type DataPoint } from '@opentelemetry/sdk-metrics';
import { LogLevel } from '@kbn/logging';
import type { OtelAppenderPluginConfig } from '@kbn/core-logging-server';
import { OtelAppender } from './otel_appender';

class TestMetricReader extends MetricReader {
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

/** An in-process OTLP HTTP logs collector that accepts every export. */
const startHttpCollector = async () => {
  const server = createServer((request, response) => {
    request.resume();
    request.on('end', () => response.writeHead(200).end());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/v1/logs`,
    stop: () => {
      server.closeAllConnections();
      server.close();
    },
  };
};

const makeRecord = (message: string) => ({
  context: 'test.context',
  level: LogLevel.Info,
  message,
  timestamp: new Date('2024-01-01T00:00:00Z'),
  pid: 1234,
});

type ExportConfig = Pick<OtelAppenderPluginConfig, 'protocol' | 'url' | 'maxElapsedTime'>;

/** Exports two records through a new appender and returns the exporter metrics it recorded. */
const exportThroughAppender = async (config: ExportConfig) => {
  const reader = new TestMetricReader();
  metrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }));
  try {
    const appender = new OtelAppender({ type: 'otel', headers: {}, ...config });
    appender.append(makeRecord('first'));
    appender.append(makeRecord('second'));
    await appender.dispose();

    const { resourceMetrics } = await reader.collect();
    const dataPointsOf = (name: string) =>
      resourceMetrics.scopeMetrics
        .flatMap(({ metrics: scopeMetrics }) => scopeMetrics)
        .filter(({ descriptor }) => descriptor.name === name)
        .flatMap<DataPoint<unknown>>(({ dataPoints }) => dataPoints)
        .map(({ attributes, value }) => ({ attributes, value }));
    return {
      exported: dataPointsOf('otel.sdk.exporter.log.exported'),
      durations: dataPointsOf('otel.sdk.exporter.operation.duration'),
    };
  } finally {
    metrics.disable();
  }
};

describe('OtelAppender exporter self-observability metrics with the retry layer', () => {
  const stopCollectors: Array<() => void> = [];

  beforeEach(() => {
    // Pin jitter to its midpoint so the backoff sequence is exactly 1000, 1500, ... ms.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    stopCollectors.splice(0).forEach((stop) => stop());
    jest.restoreAllMocks();
  });

  it('counts a batch once, as exported, when it succeeds after a retried failure', async () => {
    const collector = await startCollector(1);
    stopCollectors.push(collector.stop);

    const { exported, durations } = await exportThroughAppender({
      protocol: 'grpc',
      url: collector.url,
      maxElapsedTime: moment.duration(1, 'minute'),
    });

    expect(collector.getExportCalls()).toBe(2);
    expect(exported).toEqual([
      {
        value: 2,
        attributes: expect.not.objectContaining({ 'error.type': expect.anything() }),
      },
    ]);
    expect(durations).toEqual([
      {
        value: expect.objectContaining({ count: 1 }),
        attributes: expect.objectContaining({ 'rpc.response.status_code': 'OK' }),
      },
    ]);
  });

  it('counts a batch once, as failed, when the retry budget runs out', async () => {
    const collector = await startCollector(Infinity);
    stopCollectors.push(collector.stop);

    // 2s budget: attempts at t=0 and t=1000; the next backoff (1500ms) would pass the deadline.
    const { exported, durations } = await exportThroughAppender({
      protocol: 'grpc',
      url: collector.url,
      maxElapsedTime: moment.duration(2, 'seconds'),
    });

    expect(collector.getExportCalls()).toBe(2);
    expect(exported).toEqual([
      { value: 2, attributes: expect.objectContaining({ 'error.type': expect.any(String) }) },
    ]);
    expect(durations).toEqual([
      {
        value: expect.objectContaining({ count: 1 }),
        attributes: expect.objectContaining({ 'rpc.response.status_code': 'UNAVAILABLE' }),
      },
    ]);
  });

  it.each<[OtelAppenderPluginConfig['protocol'], () => Promise<string>]>([
    // Nothing listens on the default port, and the SDK records gRPC targets without the scheme.
    ['grpc', async () => 'https://127.0.0.1'],
    ['http', async () => startHttpCollectorUrl()],
    ['proto', async () => startHttpCollectorUrl()],
  ])('records the same attributes as the SDK %s exporter does', async (protocol, getUrl) => {
    const url = await getUrl();
    const attributesOf = (dataPoints: Array<{ attributes: Attributes }>) =>
      dataPoints.map(({ attributes }) => omit(attributes, 'otel.component.name'));

    const sdk = await exportThroughAppender({ protocol, url });
    // A budget below the first backoff: the retry layer makes a single attempt, like the SDK.
    const retrying = await exportThroughAppender({
      protocol,
      url,
      maxElapsedTime: moment.duration(500, 'milliseconds'),
    });

    expect(sdk.exported).toHaveLength(1);
    expect(attributesOf(retrying.exported)).toEqual(attributesOf(sdk.exported));
    expect(attributesOf(retrying.durations)).toEqual(attributesOf(sdk.durations));
  });

  const startHttpCollectorUrl = async () => {
    const collector = await startHttpCollector();
    stopCollectors.push(collector.stop);
    return collector.url;
  };
});
