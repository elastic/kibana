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

import { PublicAppInfo, AppNavLinkStatus, AppStatus, PublicLegacyAppInfo } from '../../application';
import { toNavLink } from './to_nav_link';

import { httpServiceMock } from '../../mocks';

const app = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
  id: 'some-id',
  title: 'some-title',
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.default,
  appRoute: `/app/some-id`,
  legacy: false,
  ...props,
});

const legacyApp = (props: Partial<PublicLegacyAppInfo> = {}): PublicLegacyAppInfo => ({
  appUrl: '/my-app-url',
  id: 'some-id',
  title: 'some-title',
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.default,
  legacy: true,
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

  it('flags legacy apps when converting to navLink', () => {
    expect(toNavLink(app({}), basePath).properties.legacy).toEqual(false);
    expect(toNavLink(legacyApp({}), basePath).properties.legacy).toEqual(true);
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

  it('does not generate `url` for legacy app', () => {
    const link = toNavLink(
      legacyApp({
        appUrl: '/my-legacy-app/#foo',
        defaultPath: '/some/default/path',
      }),
      basePath
    );
    expect(link.properties.url).toBeUndefined();
  });

  it('uses appUrl when converting legacy applications', () => {
    expect(
      toNavLink(
        legacyApp({
          appUrl: '/my-legacy-app/#foo',
        }),
        basePath
      ).properties
    ).toEqual(
      expect.objectContaining({
        baseUrl: 'http://localhost/base-path/my-legacy-app/#foo',
      })
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
