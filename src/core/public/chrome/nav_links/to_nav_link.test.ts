/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PublicAppInfo, AppNavLinkStatus, AppStatus } from '../../application';
import { toNavLink } from './to_nav_link';

import { httpServiceMock } from '../../mocks';

const app = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
  id: 'some-id',
  title: 'some-title',
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.default,
  appRoute: `/app/some-id`,
  meta: {
    keywords: [],
    searchDeepLinks: [],
  },
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
    expect(link.properties.url).toEqual('http://localhost/base-path/my-route/my-path');

    link = toNavLink(
      app({
        appRoute: '/my-route/my-path',
        defaultPath: 'some/default/path',
      }),
      basePath
    );
    expect(link.properties.url).toEqual(
      'http://localhost/base-path/my-route/my-path/some/default/path'
    );
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
});
