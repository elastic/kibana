/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      meta: {
        keywords: [],
        searchDeepLinks: [],
      },
    });
  });

  it('populates default values for nested searchDeepLinks', () => {
    const app = createApp({
      meta: {
        searchDeepLinks: [
          {
            id: 'sub-id',
            title: 'sub-title',
            searchDeepLinks: [{ id: 'sub-sub-id', title: 'sub-sub-title', path: '/sub-sub' }],
          },
        ],
      },
    });
    const info = getAppInfo(app);

    expect(info).toEqual({
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
      appRoute: `/app/some-id`,
      meta: {
        keywords: [],
        searchDeepLinks: [
          {
            id: 'sub-id',
            title: 'sub-title',
            keywords: [],
            searchDeepLinks: [
              {
                id: 'sub-sub-id',
                title: 'sub-sub-title',
                path: '/sub-sub',
                keywords: [],
                searchDeepLinks: [], // default empty array added
              },
            ],
          },
        ],
      },
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
      meta: {
        searchDeepLinks: [
          {
            id: 'sub-id',
            title: 'sub-title',
            searchDeepLinks: [
              {
                id: 'sub-sub-id',
                title: 'sub-sub-title',
                path: '/sub-sub',
                keywords: ['sub sub'],
              },
            ],
          },
        ],
      },
    });
    const info = getAppInfo(app);

    expect(info).toEqual({
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
      appRoute: `/app/some-id`,
      meta: {
        keywords: [],
        searchDeepLinks: [
          {
            id: 'sub-id',
            title: 'sub-title',
            keywords: [], // default empty array
            searchDeepLinks: [
              {
                id: 'sub-sub-id',
                title: 'sub-sub-title',
                path: '/sub-sub',
                keywords: ['sub sub'],
                searchDeepLinks: [],
              },
            ],
          },
        ],
      },
    });
  });
});
