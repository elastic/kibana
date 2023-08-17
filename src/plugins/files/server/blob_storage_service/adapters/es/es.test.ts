/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { promisify } from 'util';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { Semaphore } from '@kbn/std';

import { ElasticsearchBlobStorageClient } from './es';
import { errors } from '@elastic/elasticsearch';

const setImmediate = promisify(global.setImmediate);

describe('ElasticsearchBlobStorageClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let semaphore: Semaphore;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  // Exposed `clearCache()` which resets the cache for the memoized `createIndexIfNotExists()` method
  class ElasticsearchBlobStorageClientWithCacheClear extends ElasticsearchBlobStorageClient {
    static clearCache() {
      // @ts-expect-error TS2722: Cannot invoke an object which is possibly 'undefined' (??)
      this.createIndexIfNotExists.cache.clear();
    }
  }

  const createBlobStoreClient = (index?: string, indexIsAlias: boolean = false) => {
    ElasticsearchBlobStorageClientWithCacheClear.clearCache();

    return new ElasticsearchBlobStorageClientWithCacheClear(
      esClient,
      index,
      undefined,
      logger,
      semaphore,
      indexIsAlias
    );
  };

  beforeEach(() => {
    semaphore = new Semaphore(1);
    logger = loggingSystemMock.createLogger();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  test('limits max concurrent uploads', async () => {
    const blobStoreClient = createBlobStoreClient();
    const acquireSpy = jest.spyOn(semaphore, 'acquire');
    esClient.index.mockImplementation(() => {
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

  describe('.createIndexIfNotExists()', () => {
    let data: Readable;

    beforeEach(() => {
      data = Readable.from(['test']);
    });

    it('should create index if it does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      const blobStoreClient = await createBlobStoreClient('foo1');

      await blobStoreClient.upload(data);
      expect(logger.info).toHaveBeenCalledWith(
        'Creating [foo1] index for Elasticsearch blob store.'
      );

      // Calling a second time should do nothing
      logger.info.mockClear();
      await blobStoreClient.upload(data);

      expect(logger.info).not.toHaveBeenCalledWith(
        'Creating [foo1] index for Elasticsearch blob store.'
      );
    });

    it('should not create index if it already exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      await createBlobStoreClient('foo1').upload(data);

      expect(logger.debug).toHaveBeenCalledWith('[foo1] already exists. Nothing to do');
    });

    it('should not create index if `indexIsAlias` is `true`', async () => {
      await createBlobStoreClient('foo1', true).upload(data);

      expect(logger.debug).toHaveBeenCalledWith(
        'No need to create index [foo1] as it is an Alias or DS.'
      );
    });

    it('should not reject if it is unable to create the index (best effort)', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 400,
        } as ConstructorParameters<typeof errors.ResponseError>[0])
      );
      await createBlobStoreClient('foo1', false).upload(data);

      expect(logger.warn).toHaveBeenCalledWith(
        'Unable to create blob storage index [foo1], it may have been created already.'
      );
    });
  });
});
