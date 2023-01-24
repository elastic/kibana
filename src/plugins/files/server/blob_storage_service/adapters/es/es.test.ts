/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { promisify } from 'util';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { Semaphore } from '@kbn/std';

import { ElasticsearchBlobStorageClient } from './es';

const setImmediate = promisify(global.setImmediate);

describe('ElasticsearchBlobStorageClient', () => {
  let esClient: ElasticsearchClient;
  let blobStoreClient: ElasticsearchBlobStorageClient;
  let semaphore: Semaphore;

  beforeEach(() => {
    semaphore = new Semaphore(1);
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    blobStoreClient = new ElasticsearchBlobStorageClient(
      esClient,
      undefined,
      undefined,
      loggingSystemMock.createLogger(),
      semaphore
    );
  });

  test('limits max concurrent uploads', async () => {
    const acquireSpy = jest.spyOn(semaphore, 'acquire');
    (esClient.index as jest.Mock).mockImplementation(() => {
      return new Promise((res, rej) => setTimeout(() => rej('failed'), 100));
    });
    const [p1, p2, ...rest] = [
      blobStoreClient.upload(Readable.from(['test'])).catch(() => {}),
      blobStoreClient.upload(Readable.from(['test'])).catch(() => {}),
      blobStoreClient.upload(Readable.from(['test'])).catch(() => {}),
      blobStoreClient.upload(Readable.from(['test'])).catch(() => {}),
    ];
    await setImmediate();
    expect(acquireSpy).toHaveBeenCalledTimes(4);
    await p1;
    expect(esClient.index).toHaveBeenCalledTimes(1);
    await p2;
    expect(esClient.index).toHaveBeenCalledTimes(2);
    await Promise.all(rest);
    expect(esClient.index).toHaveBeenCalledTimes(4);
  });
});
