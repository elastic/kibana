/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AppNavLinkStatus,
  AppStatus,
  type PublicAppInfo,
  type PublicAppDeepLinkInfo,
} from '@kbn/core-application-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { toNavLink } from './to_nav_link';

const app = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
  id: 'some-id',
  title: 'some-title',
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.default,
  searchable: true,
  appRoute: `/app/some-id`,
  keywords: [],
  deepLinks: [],
  ...props,
});

const deepLink = (props: Partial<PublicAppDeepLinkInfo> = {}): PublicAppDeepLinkInfo => ({
  id: 'some-deep-link-id',
  title: 'my deep link',
  path: '/my-deep-link',
  navLinkStatus: AppNavLinkStatus.default,
  searchable: true,
  deepLinks: [],
  keywords: [],
  ...props,
});

describe('toNavLink', () => {
  const basePath = httpServiceMock.createSetupContract({ basePath: '/base-path' }).basePath;

  it('uses the application properties when creating the navLink', () => {
    const link = toNavLink(
      app({
        id: 'id',
        title: 'title',
        order: 12,
        tooltip: 'tooltip',
        euiIconType: 'my-icon',
      }),
      basePath
    );
    expect(link.properties).toEqual(
      expect.objectContaining({
        id: 'id',
        title: 'title',
        order: 12,
        tooltip: 'tooltip',
        euiIconType: 'my-icon',
      })
    );
  });

  it('handles applications with custom app route', () => {
    const link = toNavLink(
      app({
        appRoute: '/my-route/my-path',
      }),
      basePath
    );
    expect(link.properties.baseUrl).toEqual('http://localhost/base-path/my-route/my-path');
  });

  it('generates the `url` property', () => {
    let link = toNavLink(
      app({
        appRoute: '/my-route/my-path',
      }),
      basePath
    );
    expect(link.properties.url).toEqual('/base-path/my-route/my-path');

    link = toNavLink(
      app({
        appRoute: '/my-route/my-path',
        defaultPath: 'some/default/path',
      }),
      basePath
    );
    expect(link.properties.url).toEqual('/base-path/my-route/my-path/some/default/path');
  });

  it('uses the application status when the navLinkStatus is set to default', () => {
    expect(
      toNavLink(
        app({
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.accessible,
        }),
        basePath
      ).properties
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        hidden: false,
      })
    );

    expect(
      toNavLink(
        app({
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.inaccessible,
        }),
        basePath
      ).properties
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        hidden: true,
      })
    );
  });

  it('uses the navLinkStatus of the application to set the hidden and disabled properties', () => {
    expect(
      toNavLink(
        app({
          navLinkStatus: AppNavLinkStatus.visible,
        }),
        basePath
      ).properties
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        hidden: false,
      })
    );

    expect(
      toNavLink(
        app({
          navLinkStatus: AppNavLinkStatus.hidden,
        }),
        basePath
      ).properties
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        hidden: true,
      })
    );

    expect(
      toNavLink(
        app({
          navLinkStatus: AppNavLinkStatus.disabled,
        }),
        basePath
      ).properties
    ).toEqual(
      expect.objectContaining({
        disabled: true,
        hidden: false,
      })
    );
  });

  describe('deepLink parameter', () => {
    it('should be hidden and not disabled by default', () => {
      expect(toNavLink(app(), basePath, deepLink()).properties).toEqual(
        expect.objectContaining({
          disabled: false,
          hidden: true,
        })
      );
    });

    it('should not be hidden when navLinkStatus is visible', () => {
      expect(
        toNavLink(
          app(),
          basePath,
          deepLink({
            navLinkStatus: AppNavLinkStatus.visible,
          })
        ).properties
      ).toEqual(
        expect.objectContaining({
          disabled: false,
          hidden: false,
        })
      );
    });

    it('should be disabled when navLinkStatus is disabled', () => {
      expect(
        toNavLink(
          app(),
          basePath,
          deepLink({
            navLinkStatus: AppNavLinkStatus.disabled,
          })
        ).properties
      ).toEqual(
        expect.objectContaining({
          disabled: true,
          hidden: false,
        })
      );
    });

    it('should have href, baseUrl and url containing the path', () => {
      const testApp = app({
        appRoute: '/app/app-id',
        defaultPath: '/default-path',
      });

      expect(toNavLink(testApp, basePath).properties).toEqual(
        expect.objectContaining({
          baseUrl: 'http://localhost/base-path/app/app-id',
          url: '/base-path/app/app-id/default-path',
          href: 'http://localhost/base-path/app/app-id/default-path',
        })
      );

      expect(
        toNavLink(
          testApp,
          basePath,
          deepLink({
            id: 'deep-link-id',
            path: '/my-deep-link',
          })
        ).properties
      ).toEqual(
        expect.objectContaining({
          baseUrl: 'http://localhost/base-path/app/app-id',
          url: '/base-path/app/app-id/my-deep-link',
          href: 'http://localhost/base-path/app/app-id/my-deep-link',
        })
      );
    });

    it('should use the main app category', () => {
      expect(toNavLink(app(), basePath, deepLink()).properties.category).toBeUndefined();

      const category = { id: 'some-category', label: 'some category' };
      expect(toNavLink(app({ category }), basePath, deepLink()).properties.category).toEqual(
        category
      );
    });
  });
});
