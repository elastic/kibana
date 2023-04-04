/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ModelVersionObserver, Dependencies } from './model_version_observer';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';

const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);
async function tickOnce(dueInMs = 501) {
  jest.advanceTimersByTime(dueInMs);
  await flushPromises();
}

class TestModelVersionObserver extends ModelVersionObserver {
  constructor(client: ElasticsearchClient, logger: Logger, pollInterval: number) {
    super(client, logger, pollInterval);
  }
}

function createTestModelVersionObserver({
  client,
  logger,
  pollInterval = 1_000,
}: Dependencies): ModelVersionObserver {
  return new TestModelVersionObserver(client, logger, pollInterval);
}

describe('ModelVersionObserver', () => {
  let logger: MockedLogger;
  let client: jest.Mocked<ElasticsearchClient>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    logger = loggerMock.create();
    client = {
      indices: { get: jest.fn(() => ({})) },
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  it('is a singleton', () => {
    expect(ModelVersionObserver.from({ logger, client })).toBe(
      ModelVersionObserver.from({ logger, client })
    );
  });

  it('continues polling at interval and broadcasts to all subscribers', async () => {
    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    // Does not eagerly call
    expect(client.indices.get).not.toHaveBeenCalled();

    const next1 = jest.fn();
    const sub1 = observer.modelVersionMap$.subscribe({ next: next1 });
    const next2 = jest.fn();
    const sub2 = observer.modelVersionMap$.subscribe({ next: next2 });

    await tickOnce();

    expect(client.indices.get).toHaveBeenCalledTimes(1);
    expect(next1).toHaveBeenCalledTimes(1);
    expect(next2).toHaveBeenCalledTimes(1);

    sub1.unsubscribe();

    await tickOnce();
    await tickOnce();

    expect(client.indices.get).toHaveBeenCalledTimes(3);
    expect(next1).toHaveBeenCalledTimes(1);
    expect(next2).toHaveBeenCalledTimes(3);

    sub2.unsubscribe();
    await flushPromises();
  });

  it('stops polling when no-one is subscribed', async () => {
    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    expect(client.indices.get).not.toHaveBeenCalled();
    const sub = observer.modelVersionMap$.subscribe();
    await tickOnce();

    expect(client.indices.get).toHaveBeenCalledTimes(1);
    sub.unsubscribe();

    await tickOnce();
    await tickOnce();
    await tickOnce();
    await tickOnce();

    expect(client.indices.get).toHaveBeenCalledTimes(1);
  });

  it('subscribers get same reference', async () => {
    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    const next1 = jest.fn();
    const sub1 = observer.modelVersionMap$.subscribe({ next: next1 });
    const next2 = jest.fn();
    const sub2 = observer.modelVersionMap$.subscribe({ next: next2 });

    await tickOnce();
    expect(next1.mock.calls[0][0]).toBe(next2.mock.calls[0][0]);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  it('retries retryable errors on a growing back-off which maxes at 10s', async () => {
    (client.indices.get as jest.Mock).mockRejectedValue(new Error('test error'));

    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    const sub = observer.modelVersionMap$.subscribe();

    await tickOnce(10_000);
    sub.unsubscribe(); // let's say we unsubbed.
    await tickOnce(10_000);
    await tickOnce(10_000);
    await tickOnce(10_000);
    await tickOnce(10_000);
    // at this point we should have retried 5 times, adding additional ticks to test behaviour
    await tickOnce(10_000);
    await tickOnce(10_000);

    expect(client.indices.get).toHaveBeenCalledTimes(6); // 1 initial + 5 retries
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('does not retry unretryable errors', async () => {
    (client.indices.get as jest.Mock).mockRejectedValue(
      new errors.ResponseError({ statusCode: 400, meta: {} as any, warnings: [] })
    );

    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    const sub = observer.modelVersionMap$.subscribe();

    await tickOnce(10_000);
    sub.unsubscribe(); // let's say we unsubbed.
    await tickOnce(10_000); // no further polling should occur

    expect(client.indices.get).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('emits the expected values', async () => {
    (client.indices.get as jest.Mock).mockResolvedValueOnce({
      '.kibana_type_123': {
        mappings: {
          _meta: {
            mappingVersions: {
              a: '1',
              b: '2',
            },
          },
        },
      },
      '.kibana_type_345': {
        mappings: {
          _meta: {}, // bogus
        },
      },
    } as IndicesGetResponse);
    (client.indices.get as jest.Mock).mockResolvedValueOnce({
      '.kibana_type_123': {
        mappings: {
          _meta: {
            mappingVersions: {
              a: '2',
              b: '2',
            },
          },
        },
      },
      '.kibana_type_345': {
        mappings: {
          _meta: {}, // bogus
        },
      },
    } as IndicesGetResponse);

    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    const next = jest.fn();
    const sub = observer.modelVersionMap$.subscribe({ next });

    await tickOnce();
    expect(next).toHaveBeenNthCalledWith(1, { a: 1, b: 2 });
    await tickOnce();
    expect(next).toHaveBeenNthCalledWith(2, { a: 2, b: 2 });

    sub.unsubscribe();
  });

  it('can return just the latest value', async () => {
    const observer = createTestModelVersionObserver({ client, logger, pollInterval: 500 });
    await expect(observer.getCurrentModelVersion()).resolves.toEqual({});
    await tickOnce(1000); // Ensure that we are not polling
    expect(client.indices.get).toHaveBeenCalledTimes(1);

    await expect(observer.getCurrentModelVersion()).resolves.toEqual({});
    await tickOnce(1000); // Ensure that we are not polling
    expect(client.indices.get).toHaveBeenCalledTimes(2);
  });
});
