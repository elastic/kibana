/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { of, delay, merge, tap, mergeMap } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import type {
  FileKindBrowser,
  FileJSON,
  BaseFilesClient as FilesClient,
} from '@kbn/shared-ux-file-types';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { ImageMetadataFactory } from '@kbn/shared-ux-file-util';

import { UploadState } from './upload_state';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

describe('UploadState', () => {
  let filesClient: DeeplyMockedKeys<FilesClient>;
  let uploadState: UploadState;
  let testScheduler: TestScheduler;
  const imageMetadataFactory = (() => of(undefined)) as unknown as ImageMetadataFactory;

  beforeEach(() => {
    filesClient = createMockFilesClient();
    filesClient.create.mockReturnValue(of({ file: { id: 'test' } as FileJSON }) as any);
    filesClient.upload.mockReturnValue(of(undefined) as any);
    uploadState = new UploadState(
      {
        id: 'test',
        http: {},
        maxSizeBytes: 1000,
        allowedMimeTypes: ['text/plain', 'image/png'],
      } as FileKindBrowser,
      filesClient,
      {},
      imageMetadataFactory
    );
    testScheduler = getTestScheduler();
  });

  it('calls file client with expected arguments', async () => {
    testScheduler.run(({ expectObservable, cold, flush }) => {
      const file1 = { name: 'test.png', size: 1, type: 'image/png' } as File;

      uploadState.setFiles([file1]);

      // Simulate upload being triggered async
      const upload$ = cold('--a|').pipe(tap(uploadState.upload));

      expectObservable(upload$).toBe('--a|');

      flush();

      expect(filesClient.create).toHaveBeenCalledTimes(1);
      expect(filesClient.create).toHaveBeenNthCalledWith(1, {
        kind: 'test',
        meta: 'a',
        mimeType: 'image/png',
        name: 'test',
      });
      expect(filesClient.upload).toHaveBeenCalledTimes(1);
      expect(filesClient.upload).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          selfDestructOnAbort: true,
        })
      );
    });
  });

  it('uploads all provided files', async () => {
    testScheduler.run(({ expectObservable, cold, flush }) => {
      const file1 = { name: 'test', size: 1, type: 'text/plain' } as File;
      const file2 = { name: 'test 2', size: 1, type: 'text/plain' } as File;

      uploadState.setFiles([file1, file2]);

      // Simulate upload being triggered async
      const upload$ = cold('--a|').pipe(tap(uploadState.upload));

      expectObservable(upload$).toBe('--a|');

      expectObservable(uploadState.uploading$).toBe('a-(bc)', {
        a: false,
        b: true,
        c: false,
      });

      expectObservable(uploadState.files$).toBe('a-(bc)', {
        a: [
          { file: file1, status: 'idle' },
          { file: file2, status: 'idle' },
        ],
        b: [
          { file: file1, status: 'uploading' },
          { file: file2, status: 'uploading' },
        ],
        c: [
          { file: file1, status: 'uploaded', id: 'test', fileJSON: { id: 'test' } },
          { file: file2, status: 'uploaded', id: 'test', fileJSON: { id: 'test' } },
        ],
      });

      flush();

      expect(filesClient.create).toHaveBeenCalledTimes(2);
      expect(filesClient.upload).toHaveBeenCalledTimes(2);
      expect(filesClient.delete).not.toHaveBeenCalled();
    });
  });

  it('attempts to clean up all files when aborting', async () => {
    testScheduler.run(({ expectObservable, cold, flush }) => {
      filesClient.create.mockReturnValue(
        of({ file: { id: 'test' } as FileJSON }).pipe(delay(2)) as any
      );
      filesClient.upload.mockReturnValue(of(undefined).pipe(delay(10)) as any);
      filesClient.delete.mockReturnValue(of(undefined) as any);

      const file1 = { name: 'test', type: 'text/plain' } as File;
      const file2 = { name: 'test 2.png', type: 'image/png' } as File;

      uploadState.setFiles([file1, file2]);

      // Simulate upload being triggered async
      const upload$ = cold('-0|').pipe(tap(() => uploadState.upload({ myMeta: true })));
      const abort$ = cold(' --1|').pipe(tap(uploadState.abort));

      expectObservable(merge(upload$, abort$)).toBe('-01|');

      expectObservable(uploadState.error$).toBe('0---', [undefined]);

      expectObservable(uploadState.uploading$).toBe('ab-c', {
        a: false,
        b: true,
        c: false,
      });

      expectObservable(uploadState.files$).toBe('ab-c', {
        a: [
          { file: file1, status: 'idle' },
          { file: file2, status: 'idle' },
        ],
        b: [
          { file: file1, status: 'uploading' },
          { file: file2, status: 'uploading' },
        ],
        c: [
          { file: file1, status: 'upload_failed' },
          { file: file2, status: 'upload_failed' },
        ],
      });

      flush();

      expect(filesClient.create).toHaveBeenCalledTimes(2);
      expect(filesClient.create).toHaveBeenNthCalledWith(1, {
        kind: 'test',
        meta: { myMeta: true },
        mimeType: 'text/plain',
        name: 'test',
      });
      expect(filesClient.create).toHaveBeenNthCalledWith(2, {
        kind: 'test',
        meta: { myMeta: true },
        mimeType: 'image/png',
        name: 'test 2',
      });
      expect(filesClient.upload).toHaveBeenCalledTimes(2);
    });
  });

  it('throws for files that are too large', () => {
    testScheduler.run(({ expectObservable }) => {
      const file = {
        name: 'test',
        size: 1001,
      } as File;
      uploadState.setFiles([file]);
      expectObservable(uploadState.files$).toBe('a', {
        a: [
          {
            file,
            status: 'idle',
            error: new Error('File is too large. Maximum size is 1,000 bytes.'),
          },
        ],
      });
    });
  });

  it('throws for files, which mime-type is not supported', () => {
    testScheduler.run(({ expectObservable }) => {
      const file = {
        name: 'script.sh',
        size: 123,
        type: 'text/x-sh',
      } as File;
      uploadState.setFiles([file]);
      expectObservable(uploadState.files$).toBe('a', {
        a: [
          {
            file,
            status: 'idle',
            error: new Error(
              'File mime type "text/x-sh" is not supported. Supported mime types are: text/plain, image/png.'
            ),
          },
        ],
      });
    });
  });

  it('option "allowRepeatedUploads" calls clear after upload is done', () => {
    testScheduler.run(({ expectObservable, cold }) => {
      uploadState = new UploadState(
        { id: 'test', http: {}, maxSizeBytes: 1000 } as FileKindBrowser,
        filesClient,
        { allowRepeatedUploads: true },
        imageMetadataFactory
      );
      const file1 = { name: 'test' } as File;
      const file2 = { name: 'test 2.png' } as File;

      uploadState.setFiles([file1, file2]);

      const upload$ = cold('-0|').pipe(mergeMap(() => uploadState.upload({ myMeta: true })));
      expectObservable(upload$, '           --^').toBe('---0|', [undefined]);
      expectObservable(uploadState.clear$, '^').toBe('  ---0-', [undefined]);
    });
  });

  it('correctly detects when files are ready for upload', () => {
    const file1 = { name: 'test' } as File;
    const file2 = { name: 'test 2.png' } as File;
    expect(uploadState.hasFiles()).toBe(false);
    uploadState.setFiles([file1, file2]);
    expect(uploadState.hasFiles()).toBe(true);
    uploadState.setFiles([]);
    expect(uploadState.hasFiles()).toBe(false);
  });
});
