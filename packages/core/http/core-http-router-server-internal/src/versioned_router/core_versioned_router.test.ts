/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core-http-server';
import { createRouter } from './mocks';
import { CoreVersionedRouter } from '.';

describe('Versioned router', () => {
  let router: IRouter;
  beforeEach(() => {
    router = createRouter();
  });

  it('can register multiple routes', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    versionedRouter.get({ path: '/test/{id}', access: 'internal' });
    versionedRouter.post({ path: '/test', access: 'internal' });
    versionedRouter.delete({ path: '/test', access: 'internal' });
    expect(versionedRouter.getRoutes()).toHaveLength(3);
  });
});
