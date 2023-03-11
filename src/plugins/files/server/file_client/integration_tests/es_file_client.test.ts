/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TestEnvironmentUtils, setupIntegrationEnvironment } from '../../test_utils';
import { createEsFileClient } from '../create_es_file_client';
import { FileClient } from '../types';
import { FileMetadata } from '../../../common';

// FLAKY: https://github.com/elastic/kibana/issues/144505
// FLAKY: https://github.com/elastic/kibana/issues/144506
describe.skip('ES-index-backed file client', () => {
  let esClient: TestEnvironmentUtils['esClient'];
  let fileClient: FileClient;
  let testHarness: TestEnvironmentUtils;
  const blobStorageIndex = '.kibana-test-blob';
  const metadataIndex = '.kibana-test-metadata';

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ esClient } = testHarness);
  });

  beforeEach(() => {
    fileClient = createEsFileClient({
      blobStorageIndex,
      metadataIndex,
      elasticsearchClient: esClient,
      logger: loggingSystemMock.create().get(),
    });
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  test('create a new file', async () => {
    const file = await fileClient.create({
      id: '123',
      metadata: {
        name: 'cool name',
      },
    });
    expect(file.toJSON()).toEqual(
      expect.objectContaining({
        id: '123',
        fileKind: 'none',
        status: 'AWAITING_UPLOAD',
        updated: expect.any(String),
        created: expect.any(String),
        name: 'cool name',
      })
    );
    await fileClient.delete({ id: file.id, hasContent: false });
  });

  test('uploads and downloads file content', async () => {
    const file = await fileClient.create({
      id: '123',
      metadata: {
        name: 'cool name',
      },
    });
    await file.uploadContent(Readable.from([Buffer.from('test')]));
    const rs = await file.downloadContent();
    const chunks: Buffer[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString('utf-8')).toBe('test');

    await fileClient.delete({ id: file.id, hasContent: true });
  });

  test('searches across files', async () => {
    const { id: id1 } = await fileClient.create({
      id: '123',
      metadata: {
        name: 'cool name 1',
        meta: {
          test: '1',
        },
      },
    });
    const { id: id2 } = await fileClient.create({
      id: '1234',
      metadata: {
        name: 'cool name 2',
        meta: {
          test: '2',
        },
      },
    });
    const file3 = await fileClient.create({
      id: '12345',
      metadata: {
        name: 'cool name 3',
        meta: {
          test: '3',
        },
      },
    });

    await file3.uploadContent(Readable.from(['test']));

    {
      const { files: results } = await fileClient.find({
        status: ['READY'],
        meta: { test: '3' },
      });

      expect(results).toHaveLength(1);

      expect(results[0]).toEqual(
        expect.objectContaining({
          id: file3.id,
        })
      );
    }

    {
      const { files: results } = await fileClient.find({
        status: ['READY', 'AWAITING_UPLOAD'],
      });

      expect(results).toHaveLength(3);

      expect(results[0]).toEqual(
        expect.objectContaining({
          id: id1,
        })
      );

      expect(results[1]).toEqual(
        expect.objectContaining({
          id: id2,
        })
      );

      expect(results[2]).toEqual(
        expect.objectContaining({
          id: file3.id,
        })
      );
    }

    await Promise.all([
      fileClient.delete({ id: id1 }),
      fileClient.delete({ id: id2 }),
      fileClient.delete({ id: file3.id }),
    ]);
  });

  test('does not list deleted files', async () => {
    const { id: id1 } = await fileClient.create({
      id: '123',
      metadata: {
        name: 'cool name 1',
        meta: {
          test: '1',
        },
      },
    });
    const id2 = '1234';
    await esClient.index<{ file: FileMetadata }>({
      id: id2,
      index: metadataIndex,
      document: {
        file: {
          FileKind: 'none',
          Status: 'DELETED',
          Updated: new Date().toISOString(),
          created: new Date().toISOString(),
          name: 'coolname',
        },
      },
    });

    const { files } = await fileClient.find();

    expect(files).toHaveLength(1);
    expect(files[0].toJSON()).toEqual(
      expect.objectContaining({
        id: '123',
        fileKind: 'none',
        meta: { test: '1' },
        status: 'AWAITING_UPLOAD',
        updated: expect.any(String),
        created: expect.any(String),
        name: 'cool name 1',
      })
    );

    await Promise.all([
      fileClient.delete({ id: id1, hasContent: false }),
      fileClient.delete({ id: id2, hasContent: false }),
    ]);
  });
});
