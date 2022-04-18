/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Location } from 'history';
import type { AppMountParameters, CoreSetup, ScopedHistory } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { UrlForwardingStart } from '../plugin';
import { createLegacyUrlForwardApp } from './forward_app';

function createAppMountParams(hash: string): AppMountParameters {
  return {
    history: {
      location: {
        hash,
      } as Location<unknown>,
    } as ScopedHistory,
  } as AppMountParameters;
}

describe('forward_app', () => {
  let coreSetup: CoreSetup<{}, UrlForwardingStart>;
  let coreStart: ReturnType<typeof coreMock['createStart']>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup({ basePath: '/base/path' });
    coreStart = coreMock.createStart({ basePath: '/base/path' });
    coreSetup.getStartServices = () => Promise.resolve([coreStart, {}, {} as any]);
  });

  it('should forward to defaultRoute if hash is not a known redirect', async () => {
    coreStart.uiSettings.get.mockImplementation((key) => {
      if (key === 'defaultRoute') return '/app/defaultApp';
      throw new Error('Mock implementation missing');
    });

    const app = createLegacyUrlForwardApp(coreSetup, [
      { legacyAppId: 'discover', newAppId: 'discover', rewritePath: (p) => p },
    ]);
    await app.mount(createAppMountParams('#/foobar'));
    expect(coreStart.application.navigateToUrl).toHaveBeenCalledWith('/base/path/app/defaultApp');
  });

  it('should not forward to defaultRoute if hash path is a known redirect', async () => {
    const app = createLegacyUrlForwardApp(coreSetup, [
      { legacyAppId: 'discover', newAppId: 'discover', rewritePath: (p) => p },
    ]);
    await app.mount(createAppMountParams('#/discover'));
    expect(coreStart.application.navigateToUrl).not.toHaveBeenCalled();
  });
});
