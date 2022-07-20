/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as kbnTestServer from '../../../test_helpers/kbn_server';
import { Root } from '../../root';

describe('default route provider', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;

  beforeAll(async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });
    esServer = await startES();
    root = kbnTestServer.createRootWithCorePlugins({
      server: {
        basePath: '/hello',
      },
    });

    await root.preboot();
    await root.setup();
    await root.start();
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  it('redirects to the configured default route respecting basePath', async function () {
    const { status, header } = await kbnTestServer.request.get(root, '/');

    expect(status).toEqual(302);
    expect(header).toMatchObject({
      location: '/hello/app/home',
    });
  });

  it('ignores invalid values', async function () {
    const invalidRoutes = [
      'http://not-your-kibana.com',
      '///example.com',
      '//example.com',
      ' //example.com',
    ];

    for (const url of invalidRoutes) {
      await kbnTestServer.request
        .post(root, '/api/kibana/settings/defaultRoute')
        .send({ value: url })
        .expect(400);
    }

    const { status, header } = await kbnTestServer.request.get(root, '/');
    expect(status).toEqual(302);
    expect(header).toMatchObject({
      location: '/hello/app/home',
    });
  });

  it('consumes valid values', async function () {
    await kbnTestServer.request
      .post(root, '/api/kibana/settings/defaultRoute')
      .send({ value: '/valid' })
      .expect(200);

    const { status, header } = await kbnTestServer.request.get(root, '/');
    expect(status).toEqual(302);
    expect(header).toMatchObject({
      location: '/hello/valid',
    });
  });
});
