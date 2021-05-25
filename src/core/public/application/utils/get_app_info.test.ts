/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { App, AppNavLinkStatus, AppStatus } from '../types';
import { getAppInfo } from './get_app_info';

describe('getAppInfo', () => {
  const createApp = (props: Partial<App> = {}): App => ({
    mount: () => () => undefined,
    updater$: of(() => undefined),
    id: 'some-id',
    title: 'some-title',
    status: AppStatus.accessible,
    navLinkStatus: AppNavLinkStatus.default,
    appRoute: `/app/some-id`,
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
      keywords: [],
      deepLinks: [],
    });
  });

  it('populates default values for nested deepLinks', () => {
    const app = createApp({
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          deepLinks: [{ id: 'sub-sub-id', title: 'sub-sub-title', path: '/sub-sub' }],
        },
      ],
    });
    const info = getAppInfo(app);

    expect(info).toEqual({
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
      appRoute: `/app/some-id`,
      keywords: [],
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          keywords: [],
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              path: '/sub-sub',
              keywords: [],
              deepLinks: [], // default empty array added
            },
          ],
        },
      ],
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

  it('adds default meta fields to sublinks when needed', () => {
    const app = createApp({
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              path: '/sub-sub',
              keywords: ['sub sub'],
            },
          ],
        },
      ],
    });
    const info = getAppInfo(app);

    expect(info).toEqual({
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
      appRoute: `/app/some-id`,
      keywords: [],
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          keywords: [], // default empty array
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              path: '/sub-sub',
              keywords: ['sub sub'],
              deepLinks: [],
            },
          ],
        },
      ],
    });
  });
});
