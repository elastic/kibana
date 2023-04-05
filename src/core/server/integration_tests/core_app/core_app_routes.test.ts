/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Root } from '@kbn/core-root-server-internal';
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('Core app routes', () => {
  let root: Root;

  beforeAll(async function () {
    root = createRoot({
      plugins: { initialize: false },
      elasticsearch: { skipStartupConnectionCheck: true },
      server: {
        basePath: '/base-path',
      },
    });

    await root.preboot();
    await root.setup();
    await root.start();
  });

  afterAll(async function () {
    await root.shutdown();
  });

  describe('`/{path*}` route', () => {
    it('redirects requests to include the basePath', async () => {
      const response = await request.get(root, '/some-path/').expect(302);
      expect(response.get('location')).toEqual('/base-path/some-path');
    });

    it('includes the query in the redirect', async () => {
      const response = await request.get(root, '/some-path/?foo=bar').expect(302);
      expect(response.get('location')).toEqual('/base-path/some-path?foo=bar');
    });

    it('does not redirect if the path starts with `//`', async () => {
      await request.get(root, '//some-path/').expect(404);
    });

    it('does not redirect if the path does not end with `/`', async () => {
      await request.get(root, '/some-path').expect(404);
    });

    it('does not add the basePath if the path already contains it', async () => {
      const response = await request.get(root, '/base-path/foo/').expect(302);
      expect(response.get('location')).toEqual('/base-path/foo');
    });

    it('URI encodes redirect path', async () => {
      const response = await request.get(root, '/%5Csome-path/').expect(302);
      expect(response.get('location')).toEqual('/base-path/%5Csome-path');
    });
  });

  describe('`/` route', () => {
    it('prevails on the `/{path*}` route', async () => {
      const response = await request.get(root, '/').expect(302);
      expect(response.get('location')).toEqual('/base-path/app/home');
    });
  });
});
