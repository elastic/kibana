/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { App, AppDeepLink, AppNavLinkStatus, AppStatus } from '../types';
import { getAppInfo } from './get_app_info';

describe('getAppInfo', () => {
  const createApp = (props: Partial<App> = {}): App => ({
    mount: () => () => undefined,
    updater$: of(() => undefined),
    id: 'some-id',
    title: 'some-title',
    status: AppStatus.accessible,
    navLinkStatus: AppNavLinkStatus.default,
    searchable: true,
    appRoute: `/app/some-id`,
    ...props,
  });

  const createDeepLink = (props: Partial<AppDeepLink> = {}): AppDeepLink => ({
    id: 'some-deep-link-id',
    title: 'my deep link',
    path: '/my-deep-link',
    navLinkStatus: AppNavLinkStatus.default,
    searchable: true,
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
      navLinkStatus: AppNavLinkStatus.visible,
      searchable: true,
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
      searchable: true,
      appRoute: `/app/some-id`,
      keywords: [],
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          navLinkStatus: AppNavLinkStatus.hidden,
          searchable: true,
          keywords: [],
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              path: '/sub-sub',
              keywords: [],
              navLinkStatus: AppNavLinkStatus.hidden,
              searchable: true,
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

  it('computes the searchable flag depending on the navLinkStatus when needed', () => {
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.default,
          searchable: undefined,
        })
      )
    ).toEqual(
      expect.objectContaining({
        searchable: true,
      })
    );
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.visible,
          searchable: undefined,
        })
      )
    ).toEqual(
      expect.objectContaining({
        searchable: true,
      })
    );
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.disabled,
          searchable: undefined,
        })
      )
    ).toEqual(
      expect.objectContaining({
        searchable: false,
      })
    );
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.hidden,
          searchable: undefined,
        })
      )
    ).toEqual(
      expect.objectContaining({
        searchable: false,
      })
    );
    expect(
      getAppInfo(
        createApp({
          navLinkStatus: AppNavLinkStatus.hidden,
          searchable: true,
        })
      )
    ).toEqual(
      expect.objectContaining({
        searchable: true,
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
      navLinkStatus: AppNavLinkStatus.visible,
      searchable: true,
      appRoute: `/app/some-id`,
      keywords: [],
      order: 3,
      deepLinks: [
        {
          id: 'sub-id',
          title: 'sub-title',
          navLinkStatus: AppNavLinkStatus.hidden,
          searchable: true,
          order: 2,
          keywords: [],
          deepLinks: [
            {
              id: 'sub-sub-id',
              title: 'sub-sub-title',
              navLinkStatus: AppNavLinkStatus.hidden,
              searchable: true,
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

  it('computes the deepLinks navLinkStatus when needed', () => {
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              navLinkStatus: AppNavLinkStatus.visible,
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            navLinkStatus: AppNavLinkStatus.visible,
          }),
        ],
      })
    );
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              navLinkStatus: AppNavLinkStatus.default,
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            navLinkStatus: AppNavLinkStatus.hidden,
          }),
        ],
      })
    );
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              navLinkStatus: undefined,
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            navLinkStatus: AppNavLinkStatus.hidden,
          }),
        ],
      })
    );
  });

  it('computes the deepLinks searchable depending on the navLinkStatus when needed', () => {
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              navLinkStatus: AppNavLinkStatus.default,
              searchable: undefined,
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            searchable: true,
          }),
        ],
      })
    );
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              navLinkStatus: AppNavLinkStatus.hidden,
              searchable: undefined,
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            searchable: false,
          }),
        ],
      })
    );
    expect(
      getAppInfo(
        createApp({
          deepLinks: [
            createDeepLink({
              navLinkStatus: AppNavLinkStatus.hidden,
              searchable: true,
            }),
          ],
        })
      )
    ).toEqual(
      expect.objectContaining({
        deepLinks: [
          expect.objectContaining({
            searchable: true,
          }),
        ],
      })
    );
  });
});
