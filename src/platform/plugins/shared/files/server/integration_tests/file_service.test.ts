/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'assert';
import { ElasticsearchClient } from '@kbn/core/server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { AuditLogger } from '@kbn/security-plugin/server';
import { Readable } from 'stream';

import type { FileStatus, File } from '../../common';

import {
  FileKindsRegistryImpl,
  getFileKindsRegistry,
  setFileKindsRegistry,
} from '../../common/file_kinds_registry';
import { BlobStorageService } from '../blob_storage_service';
import { FileServiceStart, FileServiceFactory } from '../file_service';
import type { CreateFileArgs } from '../file_service/file_action_types';

describe('FileService', () => {
  const fileKind: string = 'test';
  const fileKindNonDefault: string = 'test-non-default';
  const fileKindTinyFiles: string = 'tiny-files';
  const nonDefaultIndex = '.kibana-test-files';

  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let fileService: FileServiceStart;
  let blobStorageService: BlobStorageService;
  let esClient: ElasticsearchClient;
  let coreStart: InternalCoreStart;
  let fileServiceFactory: FileServiceFactory;
  let security: ReturnType<typeof securityMock.createSetup>;
  let auditLogger: AuditLogger;
  let fileKindsRegistry: ReturnType<typeof getFileKindsRegistry>;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });
    const testServers = await Promise.all([startES(), startKibana()]);
    manageES = testServers[0];
    ({ root: kbnRoot, coreStart } = testServers[1]);
    setFileKindsRegistry(new FileKindsRegistryImpl());
    fileKindsRegistry = getFileKindsRegistry();
    fileKindsRegistry.register({
      id: fileKind,
      http: {},
    });
    fileKindsRegistry.register({
      id: fileKindNonDefault,
      http: {},
      blobStoreSettings: { esFixedSizeIndex: { index: nonDefaultIndex } },
    });
    fileKindsRegistry.register({
      id: fileKindTinyFiles,
      maxSizeBytes: (file) => {
        return file.mimeType === 'text/json' ? 3 : 10;
      },
      http: {},
    });

    esClient = coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    assert.strictEqual(
      await esClient.ping(),
      true,
      'Unable to reach ES, Initial test setup failed!'
    );
    await kbnRoot.shutdown();
    await manageES.stop();
  });

  beforeEach(() => {
    security = securityMock.createSetup();
    auditLogger = { enabled: true, log: jest.fn(), includeSavedObjectNames: false };
    (security.audit.asScoped as jest.Mock).mockReturnValue(auditLogger);
    security.audit.withoutRequest = auditLogger;
    blobStorageService = new BlobStorageService(esClient, kbnRoot.logger.get('test-blob-service'));
    fileServiceFactory = new FileServiceFactory(
      coreStart.savedObjects,
      blobStorageService,
      security,
      fileKindsRegistry,
      kbnRoot.logger.get('test-file-service')
    );
    fileService = fileServiceFactory.asInternal();
  });

  let disposables: File[] = [];

  async function createDisposableFile<M = unknown>(args: CreateFileArgs<M>) {
    const file = await fileService.create(args);
    disposables.push(file);
    return file;
  }

  afterEach(async () => {
    await fileService.bulkDelete({ ids: disposables.map((d) => d.id) });
    const { files } = await fileService.find({ kind: [fileKind] });
    expect(files.length).toBe(0);
    disposables = [];
  });

  it('creates file metadata awaiting upload', async () => {
    const file = await createDisposableFile({ fileKind, name: 'test' });
    expect(file.data.name).toEqual('test');
    expect(file.data.fileKind).toEqual(fileKind);
    expect(file.data.status).toBe('AWAITING_UPLOAD' as FileStatus);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: 'create',
        outcome: 'success',
      },
      message: expect.stringContaining('Created file "test"'),
    });
  });

  it('uploads file content', async () => {
    const file = await createDisposableFile({ fileKind, name: 'test' });
    expect(file.data.status).toBe('AWAITING_UPLOAD' as FileStatus);
    await file.uploadContent(Readable.from(['upload this']));
    expect(file.data.status).toBe('READY' as FileStatus);
    const rs = await file.downloadContent();
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
  });

  it('retrieves a file', async () => {
    const { id } = await createDisposableFile({ fileKind, name: 'test' });
    const myFile = await fileService.getById({ id });
    expect(myFile?.id).toMatch(id);
  });

  it('retrieves a file using the bulk method', async () => {
    const { id } = await createDisposableFile({ fileKind, name: 'test' });
    const [myFile] = await fileService.bulkGetById({ ids: [id] });
    expect(myFile?.id).toMatch(id);
  });

  it('retrieves multiple files using the bulk method', async () => {
    const file1 = await createDisposableFile({ fileKind, name: 'test' });
    const file2 = await createDisposableFile({ fileKind, name: 'test' });
    const [myFile1, myFile2] = await fileService.bulkGetById({ ids: [file1.id, file2.id] });
    expect(myFile1?.id).toMatch(file1.id);
    expect(myFile2?.id).toMatch(file2.id);
  });

  it('throws if one of the file does not exists', async () => {
    const file1 = await createDisposableFile({ fileKind, name: 'test' });
    const unknownID = 'foo';

    await expect(async () => {
      await fileService.bulkGetById({ ids: [file1.id, unknownID] });
    }).rejects.toThrowError(`File [${unknownID}] not found`);
  });

  it('does not throw if one of the file does not exists', async () => {
    const file1 = await createDisposableFile({ fileKind, name: 'test' });
    const unknownID = 'foo';

    const [myFile1, myFile2] = await fileService.bulkGetById({
      ids: [file1.id, unknownID],
      throwIfNotFound: false,
    });

    expect(myFile1?.id).toBe(file1?.id);
    expect(myFile2).toBe(null);
  });

  it('returns the files under a map of id/File', async () => {
    const file1 = await createDisposableFile({ fileKind, name: 'test' });
    const unknownID = 'foo';

    const myFiles = await fileService.bulkGetById({
      ids: [file1.id, unknownID],
      throwIfNotFound: false,
      format: 'map',
    });

    expect(myFiles[file1?.id]?.id).toBe(file1?.id);
    expect(myFiles[unknownID]).toBe(null);
  });

  it('lists files', async () => {
    await Promise.all([
      createDisposableFile({ fileKind, name: 'test-1' }),
      createDisposableFile({ fileKind, name: 'test-2' }),
      createDisposableFile({ fileKind, name: 'test-3' }),
      createDisposableFile({ fileKind, name: 'test-3' /* Also test file with same name */ }),
    ]);
    const result = await fileService.find({ kind: [fileKind] });
    expect(result.files.length).toBe(4);
  });

  it('lists files and filters', async () => {
    await Promise.all([
      createDisposableFile({ fileKind, name: 'foo-1' }),
      createDisposableFile({ fileKind, name: 'foo-2' }),
      createDisposableFile({ fileKind, name: 'foo-3' }),
      createDisposableFile({ fileKind, name: 'test-3' }),
      createDisposableFile({ fileKind: fileKindNonDefault, name: 'foo-1' }),
    ]);
    {
      const { files, total } = await fileService.find({
        kind: [fileKind, fileKindNonDefault],
        name: ['foo*'],
        perPage: 2,
        page: 1,
      });
      expect(files.length).toBe(2);
      expect(total).toBe(4);
    }

    {
      const { files, total } = await fileService.find({
        kind: [fileKind, fileKindNonDefault],
        name: ['foo*'],
        perPage: 2,
        page: 2,
      });
      expect(files.length).toBe(2);
      expect(total).toBe(4);
    }

    // Filter out fileKind
    {
      const { files, total } = await fileService.find({
        kindToExclude: [fileKindNonDefault],
        name: ['foo*'],
        perPage: 10,
        page: 1,
      });
      expect(files.length).toBe(3); // foo-1 from fileKindNonDefault not returned
      expect(total).toBe(3);
    }
  });

  it('filters files by mime type', async () => {
    await Promise.all([
      createDisposableFile({ fileKind, name: 'My pic', mime: 'image/png' }),
      createDisposableFile({ fileKind, name: 'Vern payslip', mime: 'application/pdf' }),
    ]);

    const result1 = await fileService.find({
      kind: [fileKind],
      mimeType: ['image/png'],
    });

    expect(result1.files.length).toBe(1);
    expect(result1.files[0].name).toBe('My pic');

    const result2 = await fileService.find({
      kind: [fileKind],
      mimeType: ['application/pdf'],
    });

    expect(result2.files.length).toBe(1);
    expect(result2.files[0].name).toBe('Vern payslip');
  });

  it('filters files by user ID', async () => {
    await Promise.all([
      createDisposableFile({ fileKind, name: "Johnny's file", user: { id: '123' } }),
      createDisposableFile({ fileKind, name: "Marry's file", user: { id: '456' } }),
    ]);

    const result1 = await fileService.find({
      kind: [fileKind],
      user: ['123'],
    });

    expect(result1.files.length).toBe(1);
    expect(result1.files[0].name).toBe("Johnny's file");

    const result2 = await fileService.find({
      kind: [fileKind],
      user: ['456'],
    });

    expect(result2.files.length).toBe(1);
    expect(result2.files[0].name).toBe("Marry's file");

    const result3 = await fileService.find({
      user: ['456', '123'],
    });

    expect(result3.files.length).toBe(2);
  });

  it('deletes a single file', async () => {
    const file = await fileService.create({ fileKind, name: 'test' });
    const result = await fileService.find({ kind: [fileKind] });
    expect(result.files.length).toBe(1);
    await file.delete();
    expect(await fileService.find({ kind: [fileKind] })).toEqual({ files: [], total: 0 });
  });

  it('deletes a single file using the bulk method', async () => {
    const file = await fileService.create({ fileKind, name: 'test' });
    const result = await fileService.find({ kind: [fileKind] });
    expect(result.files.length).toBe(1);
    await fileService.bulkDelete({ ids: [file.id] });
    expect(await fileService.find({ kind: [fileKind] })).toEqual({ files: [], total: 0 });
  });

  it('deletes multiple files using the bulk method', async () => {
    const promises = Array.from({ length: 15 }, (v, i) =>
      fileService.create({ fileKind, name: 'test ' + i })
    );
    const files = await Promise.all(promises);
    const result = await fileService.find({ kind: [fileKind] });
    expect(result.files.length).toBe(15);
    await fileService.bulkDelete({ ids: files.map((file) => file.id) });
    expect(await fileService.find({ kind: [fileKind] })).toEqual({ files: [], total: 0 });
  });

  interface CustomMeta {
    some: string;
  }

  it('updates files', async () => {
    const file = await createDisposableFile<CustomMeta>({ fileKind, name: 'test' });
    const updatableFields = {
      name: 'new name',
      alt: 'my alt text',
      meta: { some: 'data' },
    };
    const updatedFile1 = await file.update(updatableFields);
    expect(updatedFile1.data.meta).toEqual(expect.objectContaining(updatableFields.meta));
    expect(updatedFile1.data.name).toBe(updatableFields.name);
    expect(updatedFile1.data.alt).toBe(updatableFields.alt);

    // Fetch the file anew to be doubly sure
    const updatedFile2 = await fileService.getById<CustomMeta>({ id: file.id });
    expect(updatedFile2.data.meta).toEqual(expect.objectContaining(updatableFields.meta));
    // Below also tests that our meta type is work as expected by using `some` field.
    expect(updatedFile2.data.meta?.some).toBe(updatableFields.meta.some);
    expect(updatedFile2.data.name).toBe(updatableFields.name);
    expect(updatedFile2.data.alt).toBe(updatableFields.alt);
  });

  it('enforces file kind max size settings', async () => {
    const file = await createDisposableFile({ fileKind: fileKindTinyFiles, name: 'test' });
    const tinyContent = Readable.from(['ok']);
    await file.uploadContent(tinyContent);

    const file2 = await createDisposableFile({ fileKind: fileKindTinyFiles, name: 'test' });
    const notSoTinyContent = Readable.from(['nok'.repeat(10)]);
    await expect(() => file2.uploadContent(notSoTinyContent)).rejects.toThrow(
      new Error('Maximum of 10 bytes exceeded')
    );
  });

  it('enforces per file max size settings, using mime type', async () => {
    const file = await createDisposableFile({
      fileKind: fileKindTinyFiles,
      name: 'test',
      mime: 'text/mime',
    });
    const tinyContent = Readable.from(['ok ok ok']);
    await file.uploadContent(tinyContent);

    const file2 = await createDisposableFile({
      fileKind: fileKindTinyFiles,
      name: 'test',
      mime: 'text/json',
    });
    const notSoTinyContent = Readable.from(['[123]']);
    await expect(() => file2.uploadContent(notSoTinyContent)).rejects.toThrow(
      new Error('Maximum of 3 bytes exceeded')
    );
  });

  describe('ES blob integration and file kinds', () => {
    it('passes blob store settings', async () => {
      const file = await createDisposableFile({ fileKind: fileKindNonDefault, name: 'test' });
      expect(await esClient.indices.exists({ index: nonDefaultIndex })).toBe(false);
      await file.uploadContent(Readable.from(['test']));
      expect(await esClient.indices.exists({ index: nonDefaultIndex })).toBe(true);
    });
  });

  describe('Sharing files', () => {
    it('creates a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'test' });
      const shareObject = await file.share({ name: 'test name' });
      expect(shareObject).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'test name',
          validUntil: expect.any(Number),
          created: expect.any(String),
          token: expect.any(String),
          fileId: file.id,
        })
      );
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        error: undefined,
        event: {
          action: 'create',
          outcome: 'success',
        },
        message: expect.stringContaining('Created file "test"'),
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        error: undefined,
        event: {
          action: 'create',
          outcome: 'success',
        },
        message: expect.stringContaining('Shared file "test"'),
      });
    });

    it('retrieves a a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'test' });
      const { id } = await file.share({ name: 'my-file-share' });
      // Check if a file share exists without using an {@link File} object
      const result = await fileService.getShareObject({ id });
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'my-file-share',
          validUntil: expect.any(Number),
          created: expect.any(String),
          fileId: file.id,
        })
      );
    });

    it('updates a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'test' });
      const { id } = await file.share({ name: 'my file share 1' });
      // Check if a file share exists without using an {@link File} object
      await fileService.updateShareObject({ id, attributes: { name: 'my file share 2' } });
      const result = await fileService.getShareObject({ id });
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'my file share 2',
          validUntil: expect.any(Number),
          created: expect.any(String),
          fileId: file.id,
        })
      );
    });

    it('lists all file share objects for a file', async () => {
      const [file, file2] = await Promise.all([
        createDisposableFile({ fileKind, name: 'test' }),
        createDisposableFile({ fileKind, name: 'anothertest' }),
      ]);

      const [share1] = await Promise.all([
        file.share({ name: 'my-file-share-1' }),
        file.share({ name: 'my-file-share-2' }),
        file.share({ name: 'my-file-share-3' }),

        file2.share({ name: 'my-file-share-1' }),
        file2.share({ name: 'my-file-share-2' }),
        file2.share({ name: 'my-file-share-3' }),
      ]);

      // Check whether updating file attributes interferes with SO references.
      await fileService.updateShareObject({
        id: share1.id,
        attributes: { name: 'my-file-share-X' },
      });

      const shares1 = await file.listShares();
      expect(shares1).toHaveLength(3);
      expect(shares1[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fileId: file.id,
        })
      );
      const shares2 = await file2.listShares();
      expect(await file2.listShares()).toHaveLength(3);
      expect(shares2[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fileId: file2.id,
        })
      );
    });

    it('deletes a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'myfile' });
      const { id } = await file.share({ name: 'my file share' });
      expect(await file.listShares()).toHaveLength(1);
      await file.unshare({ shareId: id });
      expect(await file.listShares()).toEqual([]);
      expect(auditLogger.log).toHaveBeenCalledTimes(3);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        error: undefined,
        event: {
          action: 'create',
          outcome: 'success',
        },
        message: expect.stringContaining('Created file "myfile"'),
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        error: undefined,
        event: {
          action: 'create',
          outcome: 'success',
        },
        message: expect.stringContaining('Shared file "myfile"'),
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(3, {
        error: undefined,
        event: {
          action: 'delete',
          outcome: 'success',
        },
        message: expect.stringContaining('Removed share with'),
      });
    });
  });
});
