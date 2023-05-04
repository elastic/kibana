/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { Readable } from 'stream';
import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

import { ElasticsearchBlobStorageClient, BLOB_STORAGE_SYSTEM_INDEX_NAME } from '../es';

describe('Elasticsearch blob storage', () => {
  let manageES: TestElasticsearchUtils;
  let manageKbn: TestKibanaUtils;
  let esBlobStorage: ElasticsearchBlobStorageClient;
  let esClient: ElasticsearchClient;
  let esGetSpy: jest.SpyInstance;

  beforeAll(async () => {
    ElasticsearchBlobStorageClient.configureConcurrentUpload(Infinity);
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    manageKbn = await startKibana();
    esClient = manageKbn.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await manageKbn.root.shutdown();
    await manageKbn.stop();
    await manageES.stop();
  });

  const createEsBlobStorage = ({ chunkSize }: { chunkSize?: string } = {}) =>
    new ElasticsearchBlobStorageClient(
      esClient,
      undefined,
      chunkSize,
      manageKbn.root.logger.get('es-blob-test')
    );

  beforeEach(() => {
    esBlobStorage = createEsBlobStorage();
    esGetSpy = jest.spyOn(esClient, 'get');
  });

  afterEach(async () => {
    await esClient.indices.delete({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME });
    jest.clearAllMocks();
  });

  it('sets up a new blob storage index after first write', async () => {
    expect(await esClient.indices.exists({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME })).toBe(false);
    await esBlobStorage.upload(Readable.from(['upload this']));
    expect(await esClient.indices.exists({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME })).toBe(true);
  });

  it('uploads and retrieves file content of known size', async () => {
    const { id, size } = await esBlobStorage.upload(Readable.from(['upload this']));
    const rs = await esBlobStorage.download({ id, size });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
    expect(esGetSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Test a case where, if, for whatever reason, the file size is unknown we should
   * still be able to download the file.
   */
  it('uploads and retrieves file content of unknown size', async () => {
    const { id } = await esBlobStorage.upload(Readable.from(['upload this']));
    const rs = await esBlobStorage.download({ id });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
    // Called once because we should have found 'last: true'
    expect(esGetSpy).toHaveBeenCalledTimes(1);
    expect(esGetSpy).toHaveBeenNthCalledWith(
      1,
      {
        id: id + '.0',
        index: BLOB_STORAGE_SYSTEM_INDEX_NAME,
        _source_includes: ['data', 'last'],
      },
      {
        headers: { accept: 'application/cbor' },
        asStream: true,
      }
    );
  });

  it('uploads and downloads a file of many chunks', async () => {
    const fileString = Buffer.alloc(36 * 1028, 'a');
    esBlobStorage = createEsBlobStorage({ chunkSize: '1024B' });
    const { id } = await esBlobStorage.upload(Readable.from([fileString]));
    expect(await getAllDocCount()).toMatchObject({ count: 37 });
    const rs = await esBlobStorage.download({ id });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe(fileString.toString('utf-8'));
  });

  const getAllDocCount = async () => {
    await esClient.indices.refresh({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME });
    return esClient.count({
      index: BLOB_STORAGE_SYSTEM_INDEX_NAME,
      query: { match_all: {} },
    });
  };

  it('uploads and removes file content', async () => {
    const { id } = await esBlobStorage.upload(Readable.from(['upload this']));
    expect(await getAllDocCount()).toMatchObject({ count: 1 });
    await esBlobStorage.delete(id);
    expect(await getAllDocCount()).toMatchObject({ count: 0 });
  });

  it('chunks files and then deletes all chunks when cleaning up', async () => {
    const oneMiB = 1024 * 1024;
    const fileString = Buffer.alloc(31 * oneMiB, 'a');
    const fileString2 = Buffer.alloc(8 * oneMiB, 'b');

    esBlobStorage = createEsBlobStorage();
    const { id } = await esBlobStorage.upload(Readable.from([fileString]));
    const { id: id2 } = await esBlobStorage.upload(Readable.from([fileString2]));
    expect(await getAllDocCount()).toMatchObject({ count: 10 });
    await esBlobStorage.delete(id);
    expect(await getAllDocCount()).toMatchObject({ count: 2 });
    // Now we check that the other file is still intact
    const rs = await esBlobStorage.download({ id: id2 });
    const chunks: Buffer[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    const resultString = chunks.join('');
    expect(resultString).toBe(fileString2.toString('utf-8'));
  });

  it('stores chunks at exactly max chunk size', async () => {
    esBlobStorage = createEsBlobStorage({ chunkSize: '1024B' });
    const fileBuffer = Buffer.alloc(2048, 'a');
    const { id } = await esBlobStorage.upload(Readable.from([fileBuffer]));
    expect(await getAllDocCount()).toMatchObject({ count: 2 });
    const rs = await esBlobStorage.download({ id });
    const chunks: Buffer[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toEqual(fileBuffer.toString('utf-8'));
  });

  it('successfully uploads multiple files in parallel', async () => {
    esBlobStorage = createEsBlobStorage({ chunkSize: '1024B' });
    await expect(
      Promise.all([
        esBlobStorage.upload(Readable.from([Buffer.alloc(2048, 'a')])),
        esBlobStorage.upload(Readable.from([Buffer.alloc(2048, 'a')])),
        esBlobStorage.upload(Readable.from([Buffer.alloc(2048, 'a')])),
        esBlobStorage.upload(Readable.from([Buffer.alloc(2048, 'a')])),
      ])
    ).resolves.toEqual(expect.any(Array));
  });
});
