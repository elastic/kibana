/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Root } from '@kbn/core-root-server-internal';
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('Platform assets', function () {
  let root: Root;

  beforeAll(async function () {
    root = createRoot({
      plugins: { initialize: false },
      elasticsearch: { skipStartupConnectionCheck: true },
    });

    await root.preboot();
    await root.setup();
    await root.start();
  });

  afterAll(async function () {
    await root.shutdown();
  });

  it('exposes static assets', async () => {
    await request.get(root, '/ui/favicons/favicon.svg').expect(200);
  });

  it('returns 404 if not found', async function () {
    await request.get(root, '/ui/favicons/not-a-favicon.svg').expect(404);
  });

  it('does not expose folder content', async function () {
    await request.get(root, '/ui/favicons/').expect(403);
  });

  it('does not allow file tree traversing', async function () {
    await request.get(root, '/ui/../../../../../README.md').expect(404);
  });
});
