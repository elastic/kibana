/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SupportedFileHashAlgorithm } from '../../../saved_objects/file';
import { createFileHashTransform } from '../../..';
import { File as IFile } from '../../../../common';
import { Readable } from 'stream';
import {
  FileKindsRegistryImpl,
  getFileKindsRegistry,
  setFileKindsRegistry,
} from '../../../../common/file_kinds_registry';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { SavedObjectsFileMetadataClient } from '../..';
import { BlobStorageService } from '../../../blob_storage_service';
import { InternalFileShareService } from '../../../file_share_service';
import { InternalFileService } from '../../../file_service/internal_file_service';

describe('When using the FileHashTransform', () => {
  let file: IFile;
  let fileContent: Readable;

  beforeAll(() => {
    setFileKindsRegistry(new FileKindsRegistryImpl());
    getFileKindsRegistry().register({ http: {}, id: 'fileKind' });
  });

  beforeEach(async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsServiceMock.createStartContract().createInternalRepository();
    const fileMetadaClient = new SavedObjectsFileMetadataClient('test', soClient, logger);
    const blobStorageService = new BlobStorageService(esClient, logger);
    const fileShareService = new InternalFileShareService(soClient);
    const fileService = new InternalFileService(
      fileMetadaClient,
      blobStorageService,
      fileShareService,
      undefined,
      getFileKindsRegistry(),
      logger
    );
    const fileSO = { attributes: { Status: 'AWAITING_UPLOAD' } };

    (soClient.create as jest.Mock).mockResolvedValue(fileSO);
    (soClient.update as jest.Mock).mockResolvedValue(fileSO);
    (soClient.get as jest.Mock).mockResolvedValue({
      attributes: {
        created: '2023-04-27T19:57:19.640Z',
        Updated: '2023-04-27T19:57:19.640Z',
        name: 'test',
        Status: 'DONE',
        FileKind: 'fileKind',
        hash: {
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
      },
    });

    file = await fileService.createFile({ name: 'test', fileKind: 'fileKind' });
    fileContent = Readable.from(['test']);
  });

  it('should throw an error if `fileFileHash()` is called prior to processing ending', () => {
    const fileHash = createFileHashTransform();

    expect(() => fileHash.getFileHash()).toThrow('File hash generation not yet complete');
  });

  it.each([
    ['md5', '098f6bcd4621d373cade4e832627b4f6'],
    ['sha1', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'],
    ['sha256', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'],
    [
      'sha512',
      'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff',
    ],
  ] as Array<[SupportedFileHashAlgorithm, string]>)(
    'should generate file hash using algorithm: %s',
    async (algorithm, expectedHash) => {
      const fileHash = createFileHashTransform(algorithm);
      await file.uploadContent(fileContent, undefined, {
        transforms: [fileHash],
      });

      expect(fileHash.getFileHash()).toEqual({ algorithm, value: expectedHash });
    }
  );
});
