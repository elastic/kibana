/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UpdatableFileMetadata } from '../../../../common/types';
import { setupIntegrationEnvironment, TestEnvironmentUtils } from '../../../test_utils';

describe('File kind HTTP API', () => {
  let fileKind: string;
  let createFile: TestEnvironmentUtils['createFile'];
  let root: TestEnvironmentUtils['root'];
  let request: TestEnvironmentUtils['request'];
  let testHarness: TestEnvironmentUtils;

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ createFile, root, request, fileKind } = testHarness);
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  afterEach(async () => {
    await testHarness.cleanupAfterEach();
  });

  test('create a file and return the expected payload', async () => {
    expect(await createFile()).toEqual({
      id: expect.any(String),
      created: expect.any(String),
      updated: expect.any(String),
      name: 'myFile',
      fileKind,
      status: 'AWAITING_UPLOAD',
      mimeType: 'image/png',
      extension: 'png',
      meta: {},
      user: {
        name: expect.any(String),
      },
      alt: 'a picture of my dog',
    });
  });

  test('upload a file', async () => {
    const { id } = await createFile();
    const result = await request
      .put(root, `/api/files/files/${fileKind}/${id}/blob`)
      .set('Content-Type', 'application/octet-stream')
      .send('what have you')
      .expect(200);
    expect(result.body).toEqual({ ok: true, size: 13 });
  });

  test('download a file with the expected header values', async () => {
    const { id } = await createFile({ name: 'test' });
    await request
      .put(root, `/api/files/files/${fileKind}/${id}/blob`)
      .set('content-type', 'application/octet-stream')
      .send('what have you')
      .expect(200);

    const { body: buffer, header } = await request
      .get(root, `/api/files/files/${fileKind}/${id}/blob`)
      .set('accept', 'application/octet-stream')
      .buffer()
      .expect(200);

    expect(header['content-type']).toEqual('image/png');
    expect(header['content-disposition']).toEqual('attachment; filename=test.png');
    expect(buffer.toString('utf8')).toEqual('what have you');
  });

  test('update a file', async () => {
    const { id } = await createFile({ name: 'acoolfilename' });

    const {
      body: { file },
    } = await request.get(root, `/api/files/files/${fileKind}/${id}`).expect(200);
    expect(file.name).toBe('acoolfilename');

    const updatedFileAttrs: UpdatableFileMetadata<{ something: string }> = {
      name: 'anothercoolfilename',
      alt: 'a picture of my cat',
      meta: {
        something: 'new',
      },
    };

    {
      const {
        body: { file: updatedFile },
      } = await request
        .patch(root, `/api/files/files/${fileKind}/${id}`)
        .send(updatedFileAttrs)
        .expect(200);

      expect(updatedFile).toMatchObject(updatedFileAttrs);
    }

    {
      const {
        body: { file: updatedFile },
      } = await request.get(root, `/api/files/files/${fileKind}/${id}`).expect(200);

      expect(updatedFile).toMatchObject(updatedFileAttrs);
    }
  });

  test('list current files', async () => {
    const nrOfFiles = 10;
    await Promise.all([...Array(nrOfFiles).keys()].map(() => createFile({ name: 'test' })));

    const {
      body: { files },
    } = await request.post(root, `/api/files/files/${fileKind}/list`).send({}).expect(200);

    expect(files).toHaveLength(nrOfFiles);
    expect(files[0]).toEqual(expect.objectContaining({ name: 'test' }));

    const {
      body: { files: files2 },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list?page=1&perPage=5`)
      .send({})
      .expect(200);
    expect(files2).toHaveLength(5);
  });

  test('can filter by mime type', async () => {
    await createFile({ name: 'test', mimeType: 'image/png' });
    await createFile({ name: 'test 2', mimeType: 'text/html' });

    const {
      body: { files },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        mimeType: 'image/png',
      })
      .expect(200);

    expect(files.length).toBe(1);
    expect(files[0]).toMatchObject({ name: 'test' });

    const {
      body: { files: files2 },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        mimeType: 'text/html',
      })
      .expect(200);

    expect(files2.length).toBe(1);
    expect(files2[0]).toMatchObject({ name: 'test 2' });

    const {
      body: { files: files3 },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        mimeType: ['text/html', 'image/png'],
      })
      .expect(200);

    expect(files3.length).toBe(2);
  });

  test('can filter by mime type with special characters', async () => {
    await createFile({ name: 'test', mimeType: 'image/x:123' });
    await createFile({ name: 'test 2', mimeType: 'text/html' });

    const {
      body: { files },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        mimeType: 'image/x:123',
      })
      .expect(200);

    expect(files.length).toBe(1);
    expect(files[0]).toMatchObject({ name: 'test' });
  });

  test('can filter by file extension', async () => {
    await createFile({ name: 'test', mimeType: 'image/png' });
    await createFile({ name: 'test 2', mimeType: 'text/html' });

    const {
      body: { files },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        extension: 'png',
      })
      .expect(200);

    expect(files.length).toBe(1);
    expect(files[0]).toMatchObject({ name: 'test' });

    const {
      body: { files: files2 },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        extension: 'html',
      })
      .expect(200);

    expect(files2.length).toBe(1);
    expect(files2[0]).toMatchObject({ name: 'test 2' });

    const {
      body: { files: files3 },
    } = await request
      .post(root, `/api/files/files/${fileKind}/list`)
      .send({
        extension: ['html', 'png'],
      })
      .expect(200);

    expect(files3.length).toBe(2);
  });

  const twoDaysFromNow = (): number => Date.now() + 2 * (1000 * 60 * 60 * 24);

  test('gets a single share object', async () => {
    const { id } = await createFile();
    const validUntil = twoDaysFromNow();
    const {
      body: { id: shareId },
    } = await request
      .post(root, `/api/files/shares/${fileKind}/${id}`)
      .send({ validUntil, name: 'my-share' })
      .expect(200);

    const {
      body: { share },
    } = await request.get(root, `/api/files/shares/${fileKind}/${shareId}`).expect(200);

    expect(share).toEqual(
      expect.objectContaining({
        id: shareId,
        name: 'my-share',
        validUntil,
        created: expect.any(String),
        fileId: id,
      })
    );
  });

  test('return a share token after sharing a file', async () => {
    const { id } = await createFile();

    const { body: error } = await request
      .post(root, `/api/files/shares/${fileKind}/${id}`)
      .send({
        validUntil: 1,
      })
      .expect(400);

    expect(error.message).toContain('must be in the future');

    const { body: share } = await request
      .post(root, `/api/files/shares/${fileKind}/${id}`)
      .send({ validUntil: twoDaysFromNow(), name: 'my-share' })
      .expect(200);

    expect(share).toEqual(
      expect.objectContaining({
        token: expect.any(String),
      })
    );
  });

  test('delete a file share after it was created', async () => {
    await request.delete(root, `/api/files/shares/${fileKind}/bogus`).expect(404);

    const { id } = await createFile();
    const {
      body: { id: shareId },
    } = await request
      .post(root, `/api/files/shares/${fileKind}/${id}`)
      .send({ validUntil: twoDaysFromNow(), name: 'my-share' })
      .expect(200);

    await request.delete(root, `/api/files/shares/${fileKind}/${shareId}`).expect(200);
    await request.get(root, `/api/files/shares/${fileKind}/${shareId}`).expect(404);
  });

  test('list shares', async () => {
    {
      const {
        body: { shares },
      } = await request.get(root, `/api/files/shares/${fileKind}`).expect(200);
      expect(shares).toEqual([]);
    }

    const { id } = await createFile();
    await request
      .post(root, `/api/files/shares/${fileKind}/${id}`)
      .send({ validUntil: twoDaysFromNow(), name: 'my-share-1' })
      .expect(200);
    await request
      .post(root, `/api/files/shares/${fileKind}/${id}`)
      .send({ validUntil: twoDaysFromNow(), name: 'my-share-2' })
      .expect(200);

    const { id: id2 } = await createFile();
    await request
      .post(root, `/api/files/shares/${fileKind}/${id2}`)
      .send({ validUntil: twoDaysFromNow(), name: 'my-share-3' })
      .expect(200);

    {
      const {
        body: { shares },
      } = await request.get(root, `/api/files/shares/${fileKind}?forFileId=${id}`).expect(200);
      expect(shares).toHaveLength(2);
      // When we list file shares we do not get the file token back
      expect(shares[0]).toEqual({
        id: expect.any(String),
        created: expect.any(String),
        validUntil: expect.any(Number),
        name: 'my-share-2',
        fileId: id,
      });
    }
  });
});
