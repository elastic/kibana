/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { encode } from 'cbor-x';
import { promisify } from 'util';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { Semaphore } from '@kbn/std';
import { errors } from '@elastic/elasticsearch';
import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchBlobStorageClient } from './es';

const setImmediate = promisify(global.setImmediate);

describe('ElasticsearchBlobStorageClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let uploadSemaphore: Semaphore;
  let downloadSemaphore: Semaphore;
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
      uploadSemaphore,
      downloadSemaphore,
      indexIsAlias
    );
  };

  beforeEach(() => {
    uploadSemaphore = new Semaphore(1);
    downloadSemaphore = new Semaphore(1);
    logger = loggingSystemMock.createLogger();
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    jest.clearAllMocks();
  });

  test('limits max concurrent uploads', async () => {
    const blobStoreClient = createBlobStoreClient();
    const uploadAcquireSpy = jest.spyOn(uploadSemaphore, 'acquire');
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
    expect(uploadAcquireSpy).toHaveBeenCalledTimes(4);
    await p1;
    expect(esClient.index).toHaveBeenCalledTimes(1);
    await p2;
    expect(esClient.index).toHaveBeenCalledTimes(2);
    await Promise.all(rest);
    expect(esClient.index).toHaveBeenCalledTimes(4);
  });

  test('limits max concurrent downloads', async () => {
    const index = 'someplace';

    const blobStoreClient = createBlobStoreClient(index);
    const downloadAcquireSpy = jest.spyOn(downloadSemaphore, 'acquire');

    const downloadsToQueueCount = 4;
    const documentsChunkCount = 2;

    const createDownloadContent = (documentId: number, chunkId: number) => {
      return Buffer.concat([
        Buffer.from(`download content ${documentId}.${chunkId}`, 'utf8'),
        Buffer.alloc(10 * 1028, `chunk ${chunkId}`),
      ]);
    };

    const downloadContentMap = Array.from(new Array(downloadsToQueueCount)).map(
      (_, documentIdx) => ({
        fileContent: Array.from(new Array(documentsChunkCount)).map((__, chunkIdx) =>
          createDownloadContent(documentIdx, chunkIdx)
        ),
      })
    );

    esClient.get.mockImplementation(({ id: headChunkId }) => {
      const [documentId, chunkId] = headChunkId.split(/\./);

      return new Promise(function (resolve) {
        setTimeout(
          () =>
            resolve(
              Readable.from([
                encode({
                  found: true,
                  _source: {
                    data: downloadContentMap[Number(documentId)].fileContent[Number(chunkId)],
                  },
                }),
              ]) as unknown as GetResponse
            ),
          100
        );
      });
    });

    const getDownloadStreamContent = async (stream: Readable) => {
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      /**
       * we are guaranteed that the chunks for the complete document
       * will equal the document chunk count specified within this test suite.
       * See {@link ContentStream#isRead}
       */
      expect(chunks.length).toBe(documentsChunkCount);

      return Buffer.concat(chunks).toString();
    };

    const [p1, p2, ...rest] = downloadContentMap.map(({ fileContent }, idx) => {
      // expected document size will be our returned mock file content
      // will be the sum of the lengths of chunks the entire document is split into
      const documentSize = fileContent.reduce((total, chunk) => total + chunk.length, 0);

      return blobStoreClient.download({
        id: String(idx),
        size: documentSize,
      });
    });

    await setImmediate();
    expect(downloadAcquireSpy).toHaveBeenCalledTimes(downloadsToQueueCount);

    const p1DownloadStream = await p1;
    const p1DownloadContent = await getDownloadStreamContent(p1DownloadStream);
    expect(esClient.get).toHaveBeenCalledTimes(1 * documentsChunkCount);
    expect(p1DownloadContent).toEqual(expect.stringMatching(/^download\scontent\s0.*/));

    const p2DownloadStream = await p2;
    const p2DownloadContent = await getDownloadStreamContent(p2DownloadStream);
    expect(esClient.get).toHaveBeenCalledTimes(2 * documentsChunkCount);
    expect(p2DownloadContent).toEqual(expect.stringMatching(/^download\scontent\s1.*/));

    await Promise.all(rest.map((dp) => dp.then((ds) => getDownloadStreamContent(ds))));
    expect(esClient.get).toHaveBeenCalledTimes(downloadsToQueueCount * documentsChunkCount);
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
