/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import type { FileJSON } from '../../../common';
import type { rt } from '../file_kind/create';
import { setupIntegrationEnvironment, TestEnvironmentUtils } from '../../test_utils';

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
        .send({ name: ['firstFile', 'secondFile'] })
        .expect(200);
      expect(result.body.files).toHaveLength(2);
    });

    test('file kind', async () => {
      {
        const result = await request
          .post(root, `/api/files/find`)
          .send({ kind: 'non-existent' })
          .expect(200);
        expect(result.body.files).toHaveLength(0);
      }

      {
        const result = await request
          .post(root, '/api/files/find')
          .send({ kind: testHarness.fileKind })
          .expect(200);
        expect(result.body.files).toHaveLength(3);
      }
    });

    test('status', async () => {
      const result = await request
        .post(root, '/api/files/find')
        .send({
          status: 'READY',
        })
        .expect(200);
      expect(result.body.files).toHaveLength(2);
    });

    test('combination', async () => {
      const result = await request
        .post(root, '/api/files/find')
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
        .send({
          kind: testHarness.fileKind,
          extension: 'png',
        })
        .expect(200);

      expect(result.body.files).toHaveLength(2);

      const result2 = await request
        .post(root, '/api/files/find')
        .send({
          kind: testHarness.fileKind,
          extension: 'pdf',
        })
        .expect(200);

      expect(result2.body.files).toHaveLength(1);

      const result3 = await request
        .post(root, '/api/files/find')
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
        .send({
          kind: testHarness.fileKind,
          mimeType: 'image/png',
        })
        .expect(200);

      expect(result.body.files).toHaveLength(2);

      const result2 = await request
        .post(root, '/api/files/find')
        .send({
          kind: testHarness.fileKind,
          mimeType: 'application/pdf',
        })
        .expect(200);

      expect(result2.body.files).toHaveLength(1);

      const result3 = await request
        .post(root, '/api/files/find')
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
        const { body: metrics } = await request.get(root, '/api/files/metrics').expect(200);
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
          .send({ ids: [file1.id, 'unknown'] })
          .expect(200);
        expect(response.succeeded).toEqual([file1.id]);
        expect(response.failed).toEqual([['unknown', 'File not found']]);
      }
      {
        const { body: response } = await request.post(root, `/api/files/find`).send({}).expect(200);
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
      await request.get(root, `/api/files/public/blob/myfilename.pdf`).expect(400);
      const { body: response } = await request
        .get(root, `/api/files/public/blob/myfilename.pdf?token=notavalidtoken`)
        .expect(400);

      expect(response.message).toMatch('Invalid token');
    });

    test('it downloads a publicly shared file', async () => {
      const { id } = await createFile();

      const {
        body: { token },
      } = await request.post(root, `/api/files/shares/${fileKind}/${id}`).send({}).expect(200);

      await request
        .get(root, `/api/files/public/blob/myfilename.pdf?token=${token}`)
        .buffer()
        .expect(400);

      await request
        .put(root, `/api/files/files/${fileKind}/${id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .send('test')
        .expect(200);

      const { body: buffer, header } = await request
        // By providing a file name like "myfilename.pdf" we imply that we want a pdf
        .get(root, `/api/files/public/blob/myfilename.pdf?token=${token}`)
        .buffer()
        .expect(200);

      expect(header['content-type']).toEqual('application/pdf');
      expect(header['content-disposition']).toEqual('attachment; filename=myfilename.pdf');
      expect(buffer.toString('utf8')).toEqual('test');
    });
  });
});
