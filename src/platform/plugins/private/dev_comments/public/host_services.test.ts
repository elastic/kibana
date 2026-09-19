/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createCommentsHostServices, routeOf } from './host_services';

describe('createCommentsHostServices', () => {
  const core = coreMock.createStart({ basePath: '/kbn' });
  const services = createCommentsHostServices(core);

  it('keeps routes relative to the base path', () => {
    expect(
      routeOf(
        { pathname: '/kbn/app/one', search: '?x=1', hash: '#/y?_g=(a:b)' },
        core.http.basePath
      )
    ).toEqual({ pageKey: '/app/one#/y', path: '/app/one?x=1#/y?_g=(a:b)' });
  });

  it('opens paths within the deployment under the base path and refuses the rest', async () => {
    await services.navigateToPath('/app/two#/x');
    expect(core.application.navigateToUrl).toHaveBeenCalledWith('/kbn/app/two#/x');

    // The URL parser strips the tab and reads `//evil.example/app`.
    for (const path of ['/\t/evil.example/app', '//evil.example/app', 'https://evil.example/']) {
      await expect(services.navigateToPath(path)).rejects.toThrow('outside of this deployment');
    }
    expect(core.application.navigateToUrl).toHaveBeenCalledTimes(1);
  });
});
