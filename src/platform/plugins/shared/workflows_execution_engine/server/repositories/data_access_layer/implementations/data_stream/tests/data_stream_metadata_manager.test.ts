/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { DataStreamMetadataManager } from '../data_stream_metadata_manager';

const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const SHORT_RETENTION_REFRESH_MS = FIFTEEN_DAYS_MS / 30;

const dataStreamResponse = (backingIndexes: string[], retentionTime?: string) =>
  ({
    data_streams: [
      {
        name: 'test-ds',
        lifecycle: retentionTime ? { data_retention: retentionTime } : undefined,
        indices: backingIndexes.map((index_name) => ({ index_name })),
      },
    ],
  } as never);

describe('DataStreamMetadataManager', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggerMock.create>;
  const managers: DataStreamMetadataManager[] = [];
  let streamSeq = 0;

  const createManager = (dataStreamName?: string): DataStreamMetadataManager => {
    const manager = new DataStreamMetadataManager({
      esClient,
      dataStreamName: dataStreamName ?? `test-ds-${++streamSeq}`,
      logger,
    });
    managers.push(manager);
    return manager;
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    esClient.indices.getDataStream.mockResolvedValue(
      dataStreamResponse(['.ds-test-ds-000001'], '90d')
    );
  });

  afterEach(() => {
    for (const manager of managers) {
      manager.dispose();
    }
    managers.length = 0;
    jest.useRealTimers();
  });

  it('throws from getMeta() before init()', () => {
    const manager = createManager();

    expect(() => manager.getMeta()).toThrow(/not loaded/);
  });

  it('loads backing indexes and retention on init()', async () => {
    const manager = createManager('executions-ds');

    await manager.init();

    expect(esClient.indices.getDataStream).toHaveBeenCalledWith({ name: 'executions-ds' });
    expect(manager.getMeta()).toEqual({
      retentionTime: '90d',
      backingIndexes: ['.ds-test-ds-000001'],
      writableIndex: '.ds-test-ds-000001',
    });
  });

  it('does not fetch again when init() is called concurrently or twice', async () => {
    const manager = createManager();

    await Promise.all([manager.init(), manager.init()]);
    await manager.init();

    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(1);
  });

  it('refreshes after the default interval when retention is at least 30d', async () => {
    jest.useFakeTimers();
    const manager = createManager();
    await manager.init();

    esClient.indices.getDataStream.mockResolvedValue(
      dataStreamResponse(['.ds-test-ds-000001', '.ds-test-ds-000002'], '90d')
    );

    await jest.advanceTimersByTimeAsync(ONE_HOUR_MS - 1);
    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);

    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(2);
    expect(manager.getMeta()).toEqual({
      retentionTime: '90d',
      backingIndexes: ['.ds-test-ds-000001', '.ds-test-ds-000002'],
      writableIndex: '.ds-test-ds-000002',
    });
  });

  it('refreshes at retention/30 when retention is under 30d', async () => {
    jest.useFakeTimers();
    esClient.indices.getDataStream.mockResolvedValue(
      dataStreamResponse(['.ds-test-ds-000001'], '15d')
    );
    const manager = createManager();
    await manager.init();

    esClient.indices.getDataStream.mockResolvedValue(
      dataStreamResponse(['.ds-test-ds-000001', '.ds-test-ds-000002'], '15d')
    );

    await jest.advanceTimersByTimeAsync(SHORT_RETENTION_REFRESH_MS - 1);
    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);

    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(2);
  });

  it('recomputes the next timeout from retention returned by the latest fetch', async () => {
    jest.useFakeTimers();
    const manager = createManager();
    await manager.init();

    esClient.indices.getDataStream.mockResolvedValue(
      dataStreamResponse(['.ds-test-ds-000002'], '15d')
    );
    await jest.advanceTimersByTimeAsync(ONE_HOUR_MS);
    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(2);

    esClient.indices.getDataStream.mockResolvedValue(
      dataStreamResponse(['.ds-test-ds-000003'], '15d')
    );
    await jest.advanceTimersByTimeAsync(ONE_HOUR_MS);
    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(SHORT_RETENTION_REFRESH_MS - ONE_HOUR_MS);
    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(3);
  });

  it('keeps the last snapshot and logs when a background refresh fails', async () => {
    jest.useFakeTimers();
    const manager = createManager('failing-ds');
    await manager.init();

    esClient.indices.getDataStream.mockRejectedValue(new Error('cluster unavailable'));

    await jest.advanceTimersByTimeAsync(ONE_HOUR_MS);

    expect(manager.getMeta()).toEqual({
      retentionTime: '90d',
      backingIndexes: ['.ds-test-ds-000001'],
      writableIndex: '.ds-test-ds-000001',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to refresh data stream metadata for failing-ds')
    );
  });

  it('does not refresh after dispose()', async () => {
    jest.useFakeTimers();
    const manager = createManager();
    await manager.init();
    manager.dispose();

    await jest.advanceTimersByTimeAsync(ONE_HOUR_MS);

    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(1);
  });
});
