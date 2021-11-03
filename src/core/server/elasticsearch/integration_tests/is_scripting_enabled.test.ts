/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
} from '../../../test_helpers/kbn_server';
import { isInlineScriptingEnabled } from '../is_scripting_enabled';

describe('isInlineScriptingEnabled', () => {
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

  const startServers = async ({ esArgs = [] }: { esArgs?: string[] } = {}) => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        es: {
          esArgs,
        },
        kbn: {
          elasticsearch: {
            // required for the server to start without throwing
            // as inline scripting is disabled in some tests
            skipStartupConnectionCheck: true,
          },
        },
      },
    });

    esServer = await startES();
    kibanaServer = await startKibana();
  };

  it('returns true when `script.allowed_types` is unset', async () => {
    await startServers({ esArgs: [] });

    const enabled = await isInlineScriptingEnabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(enabled).toEqual(true);
  });

  it('returns true when `script.allowed_types` is `inline`', async () => {
    await startServers({ esArgs: ['script.allowed_types=inline'] });

    const enabled = await isInlineScriptingEnabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(enabled).toEqual(true);
  });

  it('returns false when `script.allowed_types` is `stored`', async () => {
    await startServers({ esArgs: ['script.allowed_types=stored'] });

    const enabled = await isInlineScriptingEnabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(enabled).toEqual(false);
  });

  it('returns false when `script.allowed_types` is `none', async () => {
    await startServers({ esArgs: ['script.allowed_types=none'] });

    const enabled = await isInlineScriptingEnabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(enabled).toEqual(false);
  });
});
