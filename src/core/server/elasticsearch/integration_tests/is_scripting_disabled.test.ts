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
import { isInlineScriptingDisabled } from '../deprecations/is_scripting_disabled';

describe('isInlineScriptingDisabled', () => {
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
      },
    });

    esServer = await startES();
    kibanaServer = await startKibana();
  };

  it('returns false when `script.allowed_types` is unset', async () => {
    await startServers({ esArgs: [] });

    const disabled = await isInlineScriptingDisabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(disabled).toEqual(false);
  });

  it('returns false when `script.allowed_types` is `inline`', async () => {
    await startServers({ esArgs: ['script.allowed_types=inline'] });

    const disabled = await isInlineScriptingDisabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(disabled).toEqual(false);
  });

  it('returns true when `script.allowed_types` is `stored`', async () => {
    await startServers({ esArgs: ['script.allowed_types=stored'] });

    const disabled = await isInlineScriptingDisabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(disabled).toEqual(true);
  });

  it('returns true when `script.allowed_types` is `none', async () => {
    await startServers({ esArgs: ['script.allowed_types=none'] });

    const disabled = await isInlineScriptingDisabled({
      client: kibanaServer.coreStart.elasticsearch.client.asInternalUser,
    });

    expect(disabled).toEqual(true);
  });
});
