/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { of } from 'rxjs';
import { App, AppNavLinkStatus, AppStatus, LegacyApp } from './types';
import { BasePath } from '../http/base_path';
import {
  appendAppPath,
  getAppInfo,
  isLegacyApp,
  parseAppUrl,
  relativeToAbsolute,
  removeSlashes,
} from './utils';

describe('removeSlashes', () => {
  it('only removes duplicates by default', () => {
    expect(removeSlashes('/some//url//to//')).toEqual('/some/url/to/');
    expect(removeSlashes('some/////other//url')).toEqual('some/other/url');
  });

  it('remove trailing slash when `trailing` is true', () => {
    expect(removeSlashes('/some//url//to//', { trailing: true })).toEqual('/some/url/to');
  });

  it('remove leading slash when `leading` is true', () => {
    expect(removeSlashes('/some//url//to//', { leading: true })).toEqual('some/url/to/');
  });

  it('does not removes duplicates when `duplicates` is false', () => {
    expect(removeSlashes('/some//url//to/', { leading: true, duplicates: false })).toEqual(
      'some//url//to/'
    );
    expect(removeSlashes('/some//url//to/', { trailing: true, duplicates: false })).toEqual(
      '/some//url//to'
    );
  });

  it('accept mixed options', () => {
    expect(
      removeSlashes('/some//url//to/', { leading: true, duplicates: false, trailing: true })
    ).toEqual('some//url//to');
    expect(
      removeSlashes('/some//url//to/', { leading: true, duplicates: true, trailing: true })
    ).toEqual('some/url/to');
  });
});

describe('appendAppPath', () => {
  it('appends the appBasePath with given path', () => {
    expect(appendAppPath('/app/my-app', '/some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app/', 'some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', 'some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', '')).toEqual('/app/my-app');
  });

  it('preserves the trailing slash only if included in the hash', () => {
    expect(appendAppPath('/app/my-app', '/some-path/')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', '/some-path#/')).toEqual('/app/my-app/some-path#/');
    expect(appendAppPath('/app/my-app', '/some-path#/hash/')).toEqual(
      '/app/my-app/some-path#/hash/'
    );
    expect(appendAppPath('/app/my-app', '/some-path#/hash')).toEqual('/app/my-app/some-path#/hash');
  });
});

describe('isLegacyApp', () => {
  it('returns true for legacy apps', () => {
    expect(
      isLegacyApp({
        id: 'legacy',
        title: 'Legacy App',
        appUrl: '/some-url',
        legacy: true,
      })
    ).toEqual(true);
  });
  it('returns false for non-legacy apps', () => {
    expect(
      isLegacyApp({
        id: 'legacy',
        title: 'Legacy App',
        mount: () => () => undefined,
        legacy: false,
      })
    ).toEqual(false);
  });
});

describe('relativeToAbsolute', () => {
  it('converts a relative path to an absolute url', () => {
    const origin = window.location.origin;
    expect(relativeToAbsolute('path')).toEqual(`${origin}/path`);
    expect(relativeToAbsolute('/path#hash')).toEqual(`${origin}/path#hash`);
    expect(relativeToAbsolute('/path?query=foo')).toEqual(`${origin}/path?query=foo`);
  });
});

describe('parseAppUrl', () => {
  let apps: Map<string, App<any> | LegacyApp>;
  let basePath: BasePath;

  const getOrigin = () => 'https://kibana.local:8080';

  const createApp = (props: Partial<App>): App => {
    const app: App = {
      id: 'some-id',
      title: 'some-title',
      mount: () => () => undefined,
      ...props,
      legacy: false,
    };
    apps.set(app.id, app);
    return app;
  };

  const createLegacyApp = (props: Partial<LegacyApp>): LegacyApp => {
    const app: LegacyApp = {
      id: 'some-id',
      title: 'some-title',
      appUrl: '/my-url',
      ...props,
      legacy: true,
    };
    apps.set(app.id, app);
    return app;
  };

  beforeEach(() => {
    apps = new Map();
    basePath = new BasePath('/base-path');

    createApp({
      id: 'foo',
    });
    createApp({
      id: 'bar',
      appRoute: '/custom-bar',
    });
    createLegacyApp({
      id: 'legacy',
      appUrl: '/app/legacy',
    });
  });

  describe('with relative paths', () => {
    it('parses the app id', () => {
      expect(parseAppUrl('/base-path/app/foo', basePath, apps, getOrigin)).toEqual({
        app: 'foo',
        path: undefined,
      });
      expect(parseAppUrl('/base-path/custom-bar', basePath, apps, getOrigin)).toEqual({
        app: 'bar',
        path: undefined,
      });
    });
    it('parses the path', () => {
      expect(parseAppUrl('/base-path/app/foo/some/path', basePath, apps, getOrigin)).toEqual({
        app: 'foo',
        path: '/some/path',
      });
      expect(parseAppUrl('/base-path/custom-bar/another/path/', basePath, apps, getOrigin)).toEqual(
        {
          app: 'bar',
          path: '/another/path/',
        }
      );
    });
    it('includes query and hash in the path for default app route', () => {
      expect(parseAppUrl('/base-path/app/foo#hash/bang', basePath, apps, getOrigin)).toEqual({
        app: 'foo',
        path: '#hash/bang',
      });
      expect(parseAppUrl('/base-path/app/foo?hello=dolly', basePath, apps, getOrigin)).toEqual({
        app: 'foo',
        path: '?hello=dolly',
      });
      expect(parseAppUrl('/base-path/app/foo/path?hello=dolly', basePath, apps, getOrigin)).toEqual(
        {
          app: 'foo',
          path: '/path?hello=dolly',
        }
      );
      expect(parseAppUrl('/base-path/app/foo/path#hash/bang', basePath, apps, getOrigin)).toEqual({
        app: 'foo',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl('/base-path/app/foo/path#hash/bang?hello=dolly', basePath, apps, getOrigin)
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('includes query and hash in the path for custom app route', () => {
      expect(parseAppUrl('/base-path/custom-bar#hash/bang', basePath, apps, getOrigin)).toEqual({
        app: 'bar',
        path: '#hash/bang',
      });
      expect(parseAppUrl('/base-path/custom-bar?hello=dolly', basePath, apps, getOrigin)).toEqual({
        app: 'bar',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/path?hello=dolly', basePath, apps, getOrigin)
      ).toEqual({
        app: 'bar',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/path#hash/bang', basePath, apps, getOrigin)
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/path#hash/bang?hello=dolly', basePath, apps, getOrigin)
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('works with legacy apps', () => {
      expect(parseAppUrl('/base-path/app/legacy', basePath, apps, getOrigin)).toEqual({
        app: 'legacy',
        path: undefined,
      });
      expect(
        parseAppUrl('/base-path/app/legacy/path#hash?query=bar', basePath, apps, getOrigin)
      ).toEqual({
        app: 'legacy',
        path: '/path#hash?query=bar',
      });
    });
    it('returns undefined when the app is not known', () => {
      expect(parseAppUrl('/base-path/app/non-registered', basePath, apps, getOrigin)).toEqual(
        undefined
      );
      expect(parseAppUrl('/base-path/unknown-path', basePath, apps, getOrigin)).toEqual(undefined);
    });
  });

  describe('with absolute urls', () => {
    it('parses the app id', () => {
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo', basePath, apps, getOrigin)
      ).toEqual({
        app: 'foo',
        path: undefined,
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/custom-bar', basePath, apps, getOrigin)
      ).toEqual({
        app: 'bar',
        path: undefined,
      });
    });
    it('parses the path', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/some/path',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'foo',
        path: '/some/path',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/another/path/',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'bar',
        path: '/another/path/',
      });
    });
    it('includes query and hash in the path for default app routes', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo#hash/bang',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'foo',
        path: '#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo?hello=dolly',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'foo',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path?hello=dolly',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'foo',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path#hash/bang',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path#hash/bang?hello=dolly',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('includes query and hash in the path for custom app route', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar#hash/bang',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'bar',
        path: '#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar?hello=dolly',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'bar',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/path?hello=dolly',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'bar',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/path#hash/bang',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/path#hash/bang?hello=dolly',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('works with legacy apps', () => {
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/legacy', basePath, apps, getOrigin)
      ).toEqual({
        app: 'legacy',
        path: undefined,
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/legacy/path#hash?query=bar',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual({
        app: 'legacy',
        path: '/path#hash?query=bar',
      });
    });
    it('returns undefined when the app is not known', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/non-registered',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual(undefined);
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/unknown-path', basePath, apps, getOrigin)
      ).toEqual(undefined);
    });
    it('returns undefined when origin does not match', () => {
      expect(
        parseAppUrl(
          'https://other-kibana.external:8080/base-path/app/foo',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual(undefined);
      expect(
        parseAppUrl(
          'https://other-kibana.external:8080/base-path/custom-bar',
          basePath,
          apps,
          getOrigin
        )
      ).toEqual(undefined);
    });
  });
});

describe('getAppInfo', () => {
  const createApp = (props: Partial<App> = {}): App => ({
    mount: () => () => undefined,
    updater$: of(() => undefined),
    id: 'some-id',
    title: 'some-title',
    status: AppStatus.accessible,
    navLinkStatus: AppNavLinkStatus.default,
    appRoute: `/app/some-id`,
    legacy: false,
    ...props,
  });

  const createLegacyApp = (props: Partial<LegacyApp> = {}): LegacyApp => ({
    appUrl: '/my-app-url',
    updater$: of(() => undefined),
    id: 'some-id',
    title: 'some-title',
    status: AppStatus.accessible,
    navLinkStatus: AppNavLinkStatus.default,
    legacy: true,
    ...props,
  });

  it('converts an application and remove sensitive properties', () => {
    const app = createApp();
    const info = getAppInfo(app);

    expect(info).toEqual({
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
      appRoute: `/app/some-id`,
      legacy: false,
    });
  });

  it('converts a legacy application and remove sensitive properties', () => {
    const app = createLegacyApp();
    const info = getAppInfo(app);

    expect(info).toEqual({
      appUrl: '/my-app-url',
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
      legacy: true,
    });
  });

  it('computes the navLinkStatus depending on the app status', () => {
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.inaccessible,
        })
      )
    ).toEqual(
      expect.objectContaining({
        navLinkStatus: AppNavLinkStatus.hidden,
      })
    );
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.accessible,
        })
      )
    ).toEqual(
      expect.objectContaining({
        navLinkStatus: AppNavLinkStatus.visible,
      })
    );
  });
});
