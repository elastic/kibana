/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as kbnTestServer from '../../../../core/test_helpers/kbn_server';

describe('Core app routes', () => {
  let root;

  beforeAll(async function () {
    root = kbnTestServer.createRoot({
      plugins: { initialize: false },
      server: {
        basePath: '/base-path',
      },
    });

    await root.setup();
    await root.start();
  });

  afterAll(async function () {
    await root.shutdown();
  });

  describe('`/{path*}` route', () => {
    it('does not redirect if the path starts with `//`', async () => {
      await kbnTestServer.request.get(root, '//some-path/').expect(404);
    });

    it('does not redirect if the path does not end with `/`', async () => {
      await kbnTestServer.request.get(root, '/some-path').expect(404);
    });
  });
});
