/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaults } from 'lodash';
import {
  createRootWithCorePlugins,
  createTestServers,
  request,
} from '@kbn/core-test-helpers-kbn-server';
import pRetry from 'p-retry';
import { FileJSON } from '../../common';
import { getFileKindsRegistry } from '../../common/file_kinds_registry';

export type TestEnvironmentUtils = Awaited<ReturnType<typeof setupIntegrationEnvironment>>;

export async function setupIntegrationEnvironment() {
  const fileKind: string = 'test-file-kind';
  const testIndex = 'kibana-test-files';

  /**
   * Functionality to create files easily
   */
  let disposables: Array<() => Promise<void>> = [];
  const createFile = async (
    fileAttrs: Partial<{
      name: string;
      alt: string;
      meta: Record<string, any>;
      mimeType: string;
    }> = {},
    { deleteAfterTest = true }: { deleteAfterTest?: boolean } = {}
  ): Promise<FileJSON> => {
    const result = await request
      .post(root, `/api/files/files/${fileKind}`)
      .send(
        defaults(fileAttrs, {
          name: 'myFile',
          alt: 'a picture of my dog',
          meta: {},
          mimeType: 'image/png',
        })
      )
      .expect(200);
    if (deleteAfterTest) {
      disposables.push(async () => {
        await request
          .delete(root, `/api/files/files/${fileKind}/${result.body.file.id}`)
          .send()
          .expect(200);
      });
    }
    return result.body.file;
  };

  const { startES } = createTestServers({
    adjustTimeout: jest.setTimeout,
    settings: {
      es: {
        license: 'basic',
      },
    },
  });

  /**
   * Clean up methods
   */
  const cleanupAfterEach = async () => {
    await Promise.all(disposables.map((dispose) => dispose()));
    disposables = [];
    await esClient.indices.delete({ index: testIndex, ignore_unavailable: true });
  };
  const cleanupAfterAll = async () => {
    await root.shutdown();
    await manageES.stop();
  };

  /**
   * Start the servers and set them up
   */
  const manageES = await startES();

  const root = createRootWithCorePlugins({}, { oss: false });
  await root.preboot();
  await root.setup();

  /**
   * Register a test file type
   */
  const testHttpConfig = { tags: ['access:myapp'] };
  const myFileKind = {
    id: fileKind,
    blobStoreSettings: {
      esFixedSizeIndex: { index: testIndex },
    },
    http: {
      create: testHttpConfig,
      delete: testHttpConfig,
      update: testHttpConfig,
      download: testHttpConfig,
      getById: testHttpConfig,
      list: testHttpConfig,
      share: testHttpConfig,
    },
  };
  getFileKindsRegistry().register(myFileKind);
  const coreStart = await root.start();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  /**
   * Wait for endpoints to be available
   */
  await pRetry(() => request.get(root, '/api/licensing/info').expect(200), { retries: 5 });

  return {
    manageES,
    esClient,
    root,
    coreStart,
    fileKind,
    testIndex,
    request,
    createFile,
    cleanupAfterEach,
    cleanupAfterAll,
  };
}
