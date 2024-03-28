/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createRootWithCorePlugins,
  createTestServers,
  TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

function createRootWithDisabledPreboot() {
  return createRootWithCorePlugins({
    core: {
      lifecycle: {
        disablePreboot: true,
      },
    },
    logging: {
      appenders: {
        'test-console': {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
      },
      root: {
        appenders: ['test-console'],
        level: 'info',
      },
    },
  });
}

describe('Starting root with disabled preboot', () => {
  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithDisabledPreboot>;

  beforeEach(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    esServer = await startES();

    root = createRootWithDisabledPreboot();
  });

  afterEach(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('successfully boots', async () => {
    const preboot = await root.preboot();
    await root.setup();
    await root.start();

    // preboot contract is not returned when preboot is disabled
    expect(preboot).toBeUndefined();
  });
});
