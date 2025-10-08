/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { FileJSON } from '../../../common';
import type { TestEnvironmentUtils } from '../../test_utils';
import { setupIntegrationEnvironment } from '../../test_utils';
import type { rt } from '../file_kind/create';

describe('File HTTP API', () => {
  let testHarness: TestEnvironmentUtils;
  let root: TestEnvironmentUtils['root'];
  let request: TestEnvironmentUtils['request'];
  let createFile: TestEnvironmentUtils['createFile'];
  let fileKind: string;

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ request, createFile, root, fileKind } = testHarness);
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  describe('find', () => {
    beforeEach(async () => {
      const args: Array<TypeOf<typeof rt.body>> = [
        {
          name: 'firstFile',
          alt: 'my first alt',
          meta: {
            cool: 'beans',
          },
          mimeType: 'image/png',
        },
        {
          name: 'secondFile',
          alt: 'my second alt',
          meta: {
            other: 'beans',
          },
          mimeType: 'application/pdf',
        },
        {
          name: 'thirdFile',
          alt: 'my first alt',
          meta: {
            cool: 'bones',
          },
          mimeType: 'image/png',
        },
      ];

      const files = await Promise.all(args.map((arg) => createFile(arg as any)));

      for (const file of files.slice(0, 2)) {
        await request
          .put(root, `/api/files/files/${testHarness.fileKind}/${file.id}/blob`)
          .set('Content-Type', 'application/octet-stream')
          .set('x-elastic-internal-origin', 'files-test')
          .send('hello world')
          .expect(200);
      }
    });
    afterEach(async () => {
      await testHarness.cleanupAfterEach();
    });

    test('without filters', async () => {
      const result = await request.post(root, '/api/files/find').send({}).expect(200);
      expect(result.body.files).toHaveLength(3);
    });

    test('names', async () => {
      const result = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({ name: ['firstFile', 'secondFile'] })
        .expect(200);
      expect(result.body.files).toHaveLength(2);
    });

    test('file kind', async () => {
      {
        const result = await request
          .post(root, `/api/files/find`)
          .set('x-elastic-internal-origin', 'files-test')
          .send({ kind: 'non-existent' })
          .expect(200);
        expect(result.body.files).toHaveLength(0);
      }

      {
        const result = await request
          .post(root, '/api/files/find')
          .set('x-elastic-internal-origin', 'files-test')
          .send({ kind: testHarness.fileKind })
          .expect(200);
        expect(result.body.files).toHaveLength(3);
      }
    });

    test('status', async () => {
      const result = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          status: 'READY',
        })
        .expect(200);
      expect(result.body.files).toHaveLength(2);
    });

    test('combination', async () => {
      const result = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          name: ['firstFile', 'secondFile'],
          meta: { cool: 'beans' },
        })
        .expect(200);
      expect(result.body.files).toHaveLength(1);
    });

    test('extension', async () => {
      const result = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          extension: 'png',
        })
        .expect(200);

      expect(result.body.files).toHaveLength(2);

      const result2 = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          extension: 'pdf',
        })
        .expect(200);

      expect(result2.body.files).toHaveLength(1);

      const result3 = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          extension: 'txt',
        })
        .expect(200);

      expect(result3.body.files).toHaveLength(0);
    });

    test('mime type', async () => {
      const result = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          mimeType: 'image/png',
        })
        .expect(200);

      expect(result.body.files).toHaveLength(2);

      const result2 = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          mimeType: 'application/pdf',
        })
        .expect(200);

      expect(result2.body.files).toHaveLength(1);

      const result3 = await request
        .post(root, '/api/files/find')
        .set('x-elastic-internal-origin', 'files-test')
        .send({
          kind: testHarness.fileKind,
          mimeType: 'text/plain',
        })
        .expect(200);

      expect(result3.body.files).toHaveLength(0);
    });
  });

  describe('metrics', () => {
    const esMaxCapacity = 50 * 1024 * 1024 * 1024;
    afterEach(async () => {
      await testHarness.cleanupAfterEach();
    });
    test('returns usage metrics', async () => {
      {
        const { body: metrics } = await request.get(root, '/api/files/metrics').expect(200);
        expect(metrics).toEqual({
          countByExtension: {},
          countByStatus: {},
          storage: {
            esFixedSizeIndex: {
              capacity: esMaxCapacity,
              available: esMaxCapacity,
              used: 0,
            },
          },
        });
      }

      const [file1, file2] = await Promise.all([createFile(), createFile(), createFile()]);

      {
        const { body: metrics } = await request.get(root, '/api/files/metrics').expect(200);
        expect(metrics).toEqual({
          countByExtension: {
            png: 3,
          },
          countByStatus: {
            AWAITING_UPLOAD: 3,
          },
          storage: {
            esFixedSizeIndex: {
              capacity: esMaxCapacity,
              available: esMaxCapacity,
              used: 0,
            },
          },
        });
      }

      const {
        body: { size: size1 },
      } = await request
        .put(root, `/api/files/files/${fileKind}/${file1.id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .send('what have you')
        .expect(200);
      const {
        body: { size: size2 },
      } = await request
        .put(root, `/api/files/files/${fileKind}/${file2.id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .send('what have you')
        .expect(200);

      {
        const { body: metrics } = await request
          .get(root, '/api/files/metrics')
          .set('x-elastic-internal-origin', 'files-test')
          .expect(200);
        expect(metrics).toEqual({
          countByExtension: {
            png: 3,
          },
          countByStatus: {
            AWAITING_UPLOAD: 1,
            READY: 2,
          },
          storage: {
            esFixedSizeIndex: {
              capacity: esMaxCapacity,
              available: esMaxCapacity - size1 - size2,
              used: size1 + size2,
            },
          },
        });
      }
    });
  });

  describe('bulk delete', () => {
    afterEach(async () => {
      await testHarness.cleanupAfterEach();
    });
    it('bulk deletes files', async () => {
      const [file1] = await Promise.all([
        createFile({}, { deleteAfterTest: false }),
        createFile(),
        createFile(),
      ]);
      {
        const { body: response } = await request
          .delete(root, `/api/files/blobs`)
          .set('x-elastic-internal-origin', 'files-test')
          .send({ ids: [file1.id, 'unknown'] })
          .expect(200);
        expect(response.succeeded).toEqual([file1.id]);
        expect(response.failed).toEqual([['unknown', 'File not found']]);
      }
      {
        const { body: response } = await request
          .post(root, `/api/files/find`)
          .set('x-elastic-internal-origin', 'files-test')
          .send({})
          .expect(200);
        expect(response.files).toHaveLength(2);
        expect(response.files.find((file: FileJSON) => file.id === file1.id)).toBeUndefined();
      }
    });
  });

  describe('public download', () => {
    afterEach(async () => {
      await testHarness.cleanupAfterEach();
    });
    test('it returns 400 for an invalid token', async () => {
      await request
        .get(root, `/api/files/public/blob/myfilename.pdf`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(400);
      const { body: response } = await request
        .get(root, `/api/files/public/blob/myfilename.pdf?token=notavalidtoken`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(400);

      expect(response.message).toMatch('Invalid token');
    });

    test('it downloads a publicly shared file', async () => {
      const { id } = await createFile({
        name: 'myfilename.pdf',
        mimeType: 'application/pdf',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .get(root, `/api/files/public/blob/myfilename.pdf?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .buffer()
        .expect(400);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('test')
        .expect(200);

      const { body: buffer, header } = await request
        // "myfilename.pdf" has a mime type that matches the metadata
        .get(root, `/api/files/public/blob/myfilename.pdf?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .buffer()
        .expect(200);

      expect(header['content-type']).toEqual('application/pdf');
      expect(header['content-disposition']).toEqual('attachment; filename=myfilename.pdf');
      expect(buffer.toString('utf8')).toEqual('test');
    });

    test('validates file extension in public download', async () => {
      const { id } = await createFile({
        name: 'document.pdf',
        mimeType: 'application/pdf',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('pdf content')
        .expect(200);

      // Try public download with wrong extension (txt extension for PDF file)
      const result = await request
        .get(root, `/api/files/public/blob/document.txt?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(400);

      expect(result.body.message).toBe('File extension does not match file type');
    });

    test('allows public download with matching file extension', async () => {
      const { id } = await createFile({
        name: 'image.png',
        mimeType: 'image/png',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('image data')
        .expect(200);

      // Public download with correct extension should work
      const { body: buffer, header } = await request
        .get(root, `/api/files/public/blob/image.png?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .buffer()
        .expect(200);

      expect(header['content-type']).toEqual('image/png');
      expect(header['content-disposition']).toEqual('attachment; filename=image.png');
      expect(buffer.toString('utf8')).toEqual('image data');
    });

    test('allows public download with no file extension', async () => {
      const { id } = await createFile({
        name: 'README',
        mimeType: 'text/plain',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('readme content')
        .expect(200);

      // Public download without extension should work (no validation performed)
      const response = await request
        .get(root, `/api/files/public/blob/README?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .buffer()
        .expect(200);

      expect(response.header['content-type']).toEqual('text/plain; charset=utf-8');
      expect(response.text).toEqual('readme content');
    });

    test('handles case insensitive extensions in public download', async () => {
      const { id } = await createFile({
        name: 'image.jpg',
        mimeType: 'image/jpeg',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('jpeg data')
        .expect(200);

      // Both JPG and JPEG extensions should work for image/jpeg MIME type
      await request
        .get(root, `/api/files/public/blob/image.JPG?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(200);

      await request
        .get(root, `/api/files/public/blob/image.jpeg?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(200);
    });

    test('handles Unicode filenames in public download validation', async () => {
      const { id } = await createFile({
        name: 'файл.txt',
        mimeType: 'text/plain',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('text content')
        .expect(200);

      // Unicode filename with correct extension should work
      const encodedFilename = encodeURIComponent('файл.txt');
      const response = await request
        .get(root, `/api/files/public/blob/${encodedFilename}?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .buffer()
        .expect(200);

      expect(response.header['content-type']).toMatch(/^text\/plain(; charset=utf-8)?$/);

      // For text content with .buffer(), use response.text instead of response.body
      expect(response.text).toEqual('text content');

      // Wrong extension should still be rejected
      const encodedWrongFilename = encodeURIComponent('файл.pdf');
      await request
        .get(root, `/api/files/public/blob/${encodedWrongFilename}?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(400);
    });

    test('does not leak information in public download error messages', async () => {
      const { id } = await createFile({
        name: 'secret.json',
        mimeType: 'application/json',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('{"secret": "data"}')
        .expect(200);

      // Try download with wrong extension
      const result = await request
        .get(root, `/api/files/public/blob/secret.xml?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(400);

      // Should not reveal MIME type or expected extensions
      expect(result.body.message).toBe('File extension does not match file type');
      expect(result.body.message).not.toContain('json');
      expect(result.body.message).not.toContain('application/json');
    });

    test('prevents MIME type manipulation through URL filename', async () => {
      const { id } = await createFile({
        name: 'safe-document.pdf',
        mimeType: 'application/pdf',
      });

      const {
        body: { token },
      } = await request
        .post(root, `/api/files/shares/${fileKind}/${id}`)
        .set('x-elastic-internal-origin', 'files-test')
        .send({})
        .expect(200);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .set('x-elastic-internal-origin', 'files-test')
        .send('PDF content')
        .expect(200);

      // Extension validation blocks dangerous mismatched downloads
      await request
        .get(root, `/api/files/public/blob/malicious-script.html?token=${token}`)
        .set('x-elastic-internal-origin', 'files-test')
        .expect(400); // Correctly blocked!
    });
  });
});
