/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

describe('Elasticsearch version compatible with Kibana', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  afterEach(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  const start = async ({
    esArgs = [],
    esVersion,
  }: { esArgs?: string[]; esVersion?: string } = {}) => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        es: {
          esVersion,
          esArgs,
        },
      },
    });

    esServer = await startES();
    return { startKibana };
  };

  it('successfully starts Kibana 7.17.x against Elasticsearch 8.0.0', async () => {
    const { startKibana } = await start({ esVersion: '9.0.0' });
    const startWithCleanup = async () => {
      kibanaServer = await startKibana();
      return kibanaServer;
    };
    await expect(startWithCleanup()).resolves.toBeDefined();
  });
});
