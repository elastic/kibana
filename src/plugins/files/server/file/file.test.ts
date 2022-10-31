/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import { createSandbox } from 'sinon';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { Readable } from 'stream';
import { promisify } from 'util';

const setImmediate = promisify(global.setImmediate);

import { BlobStorageService } from '../blob_storage_service';
import { InternalFileService } from '../file_service/internal_file_service';
import {
  FileKindsRegistryImpl,
  getFileKindsRegistry,
  setFileKindsRegistry,
} from '../../common/file_kinds_registry';
import { InternalFileShareService } from '../file_share_service';
import { FileMetadataClient } from '../file_client';
import { SavedObjectsFileMetadataClient } from '../file_client/file_metadata_client/adapters/saved_objects';

describe('File', () => {
  let esClient: ElasticsearchClient;
  let fileService: InternalFileService;
  let blobStorageService: BlobStorageService;
  let fileShareService: InternalFileShareService;
  let soClient: ISavedObjectsRepository;
  let fileMetadaClient: FileMetadataClient;

  const sandbox = createSandbox();
  const fileKind = 'fileKind';

  beforeAll(() => {
    setFileKindsRegistry(new FileKindsRegistryImpl());
    getFileKindsRegistry().register({ http: {}, id: fileKind });
  });

  beforeEach(() => {
    const logger = loggingSystemMock.createLogger();
    esClient = elasticsearchServiceMock.createInternalClient();
    soClient = savedObjectsServiceMock.createStartContract().createInternalRepository();
    fileMetadaClient = new SavedObjectsFileMetadataClient('test', soClient, logger);
    blobStorageService = new BlobStorageService(esClient, logger);
    fileShareService = new InternalFileShareService(soClient);
    fileService = new InternalFileService(
      fileMetadaClient,
      blobStorageService,
      fileShareService,
      undefined,
      getFileKindsRegistry(),
      logger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    sandbox.restore();
  });

  it('deletes file content when an upload fails', async () => {
    const createBlobSpy = sandbox.spy(blobStorageService, 'createBlobStorageClient');

    (esClient.index as jest.Mock).mockRejectedValue(new Error('test'));
    const fileSO = { attributes: { Status: 'AWAITING_UPLOAD' } };
    (soClient.create as jest.Mock).mockResolvedValue(fileSO);
    (soClient.update as jest.Mock).mockResolvedValue(fileSO);

    const file = await fileService.createFile({ name: 'test', fileKind });
    const [{ returnValue: blobStore }] = createBlobSpy.getCalls();
    const blobStoreSpy = sandbox.spy(blobStore, 'delete');
    expect(blobStoreSpy.calledOnce).toBe(false);
    await expect(file.uploadContent(Readable.from(['test']))).rejects.toThrow(new Error('test'));
    await setImmediate();
    expect(blobStoreSpy.calledOnce).toBe(true);
  });

  it('updates file data after upload', async () => {
    const fileSO = { attributes: { Status: 'AWAITING_UPLOAD' } };
    (soClient.create as jest.Mock).mockResolvedValue(fileSO);
    (soClient.update as jest.Mock).mockResolvedValue(fileSO);

    const file = await fileService.createFile({ name: 'test', fileKind });
    await file.uploadContent(Readable.from(['test']));
    expect(file.data.status).toBe('READY');
  });

  it('sets file status and deletes content if aborted', async () => {
    const createBlobSpy = sandbox.spy(blobStorageService, 'createBlobStorageClient');
    const fileSO = { attributes: { Status: 'AWAITING_UPLOAD' } };
    (soClient.create as jest.Mock).mockResolvedValue(fileSO);
    (soClient.update as jest.Mock).mockResolvedValue(fileSO);
    const file = await fileService.createFile({ name: 'test', fileKind });
    const [{ returnValue: blobStore }] = createBlobSpy.getCalls();
    const blobStoreSpy = sandbox.spy(blobStore, 'delete');

    const abort$ = of('boom!');
    await expect(file.uploadContent(Readable.from(['test']), abort$)).rejects.toThrow(/Abort/);
    await setImmediate();
    expect(file.data.status).toBe('UPLOAD_ERROR');
    expect(blobStoreSpy.calledOnce).toBe(true);
  });
});
