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

  it('keeps routes relative to the server base path, with the space they are in', () => {
    expect(
      routeOf(
        { pathname: '/kbn/app/one', search: '?x=1', hash: '#/y?_g=(a:b)' },
        core.http.basePath
      )
    ).toEqual({ pageKey: '/app/one#/y', path: '/app/one?x=1#/y?_g=(a:b)' });
    expect(
      routeOf({ pathname: '/kbn/s/marketing/app/one', search: '', hash: '' }, core.http.basePath)
    ).toEqual({ pageKey: '/s/marketing/app/one', path: '/s/marketing/app/one' });
    expect(routeOf({ pathname: '/kbn', search: '', hash: '' }, core.http.basePath)).toEqual({
      pageKey: '/',
      path: '/',
    });
  });

  it('opens paths within the deployment under the server base path, in their space, and refuses the rest', async () => {
    await services.navigateToPath('/app/two#/x');
    expect(core.application.navigateToUrl).toHaveBeenCalledWith('/kbn/app/two#/x');
    await services.navigateToPath('/s/marketing/app/two');
    expect(core.application.navigateToUrl).toHaveBeenCalledWith('/kbn/s/marketing/app/two');

    // The URL parser strips the tab and reads `//evil.example/app`; dot segments would climb out of the base path.
    for (const path of [
      '/\t/evil.example/app',
      '//evil.example/app',
      'https://evil.example/',
      '/../outside',
      '/app/%2e%2e/%2E%2E/outside',
    ]) {
      await expect(services.navigateToPath(path)).rejects.toThrow('outside of this deployment');
    }
    expect(core.application.navigateToUrl).toHaveBeenCalledTimes(2);
  });
});
