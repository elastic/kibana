/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { App, AppDeepLink, AppStatus } from '@kbn/core-application-browser';
import { getAppInfo } from './get_app_info';

describe('getAppInfo', () => {
  const createApp = (props: Partial<App> = {}): App => ({
    mount: () => () => undefined,
    updater$: of(() => undefined),
    id: 'some-id',
    title: 'some-title',
    status: AppStatus.accessible,
    appRoute: `/app/some-id`,
    ...props,
  });

  const createDeepLink = (props: Partial<AppDeepLink> = {}): AppDeepLink => ({
    id: 'some-deep-link-id',
    title: 'my deep link',
    path: '/my-deep-link',
    visibleIn: ['globalSearch'],
    deepLinks: [],
    keywords: [],
    ...props,
  });

  it('converts an application and remove sensitive properties', () => {
    const app = createApp();
    const info = getAppInfo(app);

    expect(info).toEqual({
      id: 'some-id',
      title: 'some-title',
      status: AppStatus.accessible,
      visibleIn: ['globalSearch', 'sideNav'],
      appRoute: `/app/some-id`,
      keywords: [],
      deepLinks: [],
    });
  });

  it('does not return any deepLinks if the app is inaccessible', () => {
    const app = createApp({ status: AppStatus.inaccessible, deepLinks: [createDeepLink()] });
    const info = getAppInfo(app);
    expect(info.deepLinks).toEqual([]);
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
      visibleIn: ['globalSearch', 'sideNav'],
      appRoute: `/app/some-id`,
      keywords: [],
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          visibleIn: ['globalSearch'], // default visibleIn added
          keywords: [],
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              path: '/sub-sub',
              keywords: [],
              visibleIn: ['globalSearch'],
              deepLinks: [], // default empty array added
            },
          ],
        },
      ],
    });
  });

  it('computes the visibleIn depending on the app status', () => {
    expect(
      getAppInfo(
        createApp({
          visibleIn: ['globalSearch', 'sideNav'],
          status: AppStatus.inaccessible,
        })
      )
    ).toEqual(
      expect.objectContaining({
        visibleIn: [],
      })
    );
    expect(
      getAppInfo(
        createApp({
          visibleIn: ['globalSearch', 'sideNav'],
          status: AppStatus.accessible,
        })
      )
    ).toEqual(
      expect.objectContaining({
        visibleIn: ['globalSearch', 'sideNav'],
      })
    );
    expect(
      getAppInfo(
        createApp({
          // status is not set, default to accessible
          visibleIn: ['globalSearch', 'sideNav'],
        })
      )
    ).toEqual(
      expect.objectContaining({
        visibleIn: ['globalSearch', 'sideNav'],
      })
    );
  });

  it('adds default deepLinks when needed', () => {
    const app = createApp({
      order: 3,
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          order: 2,
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              path: '/sub-sub',
              order: 1,
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
      visibleIn: ['globalSearch', 'sideNav'],
      appRoute: `/app/some-id`,
      keywords: [],
      order: 3,
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          visibleIn: ['globalSearch'],
          order: 2,
          keywords: [],
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              visibleIn: ['globalSearch'],
              order: 1,
              path: '/sub-sub',
              keywords: ['sub sub'],
              deepLinks: [],
            },
          ],
        },
      ],
    });
  });

  it('computes the deepLinks visibleIn when needed', () => {
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              visibleIn: ['globalSearch', 'sideNav'],
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            visibleIn: ['globalSearch', 'sideNav'],
          }),
        ],
      })
    );
    expect(
      getAppInfo(
        createApp({
          deepLinks: [createDeepLink({ visibleIn: undefined })],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            visibleIn: ['globalSearch'],
          }),
        ],
      })
    );
  });
});
