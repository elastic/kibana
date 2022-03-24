/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { createMemoryHistory, History, createHashHistory } from 'history';

import { themeServiceMock } from '../../theme/theme_service.mock';
import { AppRouter, AppNotFound } from '../ui';
import { MockedMounterMap, MockedMounterTuple } from '../test_types';
import { createRenderer, createAppMounter, getUnmounter } from './utils';
import { AppStatus } from '../types';

describe('AppRouter', () => {
  let mounters: MockedMounterMap;
  let globalHistory: History;
  let update: ReturnType<typeof createRenderer>;
  let theme$: ReturnType<typeof themeServiceMock.createTheme$>;
  let scopedAppHistory: History;

  const navigate = (path: string) => {
    globalHistory.push(path);
    return update();
  };
  const mockMountersToMounters = () =>
    new Map([...mounters].map(([appId, { mounter }]) => [appId, mounter]));
  const noop = () => undefined;

  const mountersToAppStatus$ = () => {
    return new BehaviorSubject(
      new Map(
        [...mounters.keys()].map((id) => [
          id,
          id.startsWith('disabled') ? AppStatus.inaccessible : AppStatus.accessible,
        ])
      )
    );
  };

  const createMountersRenderer = () =>
    createRenderer(
      <AppRouter
        history={globalHistory}
        mounters={mockMountersToMounters()}
        appStatuses$={mountersToAppStatus$()}
        setAppLeaveHandler={noop}
        setAppActionMenu={noop}
        setIsMounting={noop}
        theme$={theme$}
      />
    );

  beforeEach(() => {
    mounters = new Map([
      createAppMounter({ appId: 'app1', html: '<span>App 1</span>' }),
      createAppMounter({ appId: 'app2', html: '<div>App 2</div>' }),
      createAppMounter({
        appId: 'app3',
        html: '<div>Chromeless A</div>',
        appRoute: '/chromeless-a/path',
      }),
      createAppMounter({
        appId: 'app4',
        html: '<div>Chromeless B</div>',
        appRoute: '/chromeless-b/path',
      }),
      createAppMounter({ appId: 'disabledApp', html: '<div>Disabled app</div>' }),
      createAppMounter({
        appId: 'scopedApp',
        extraMountHook: ({ history }) => {
          scopedAppHistory = history;
          history.push('/subpath');
        },
      }),
      createAppMounter({
        appId: 'app5',
        html: '<div>App 5</div>',
        appRoute: '/app/my-app/app5',
      }),
      createAppMounter({
        appId: 'app6',
        html: '<div>App 6</div>',
        appRoute: '/app/my-app/app6',
      }),
    ] as MockedMounterTuple[]);
    theme$ = themeServiceMock.createTheme$();
    globalHistory = createMemoryHistory();
    update = createMountersRenderer();
  });

  it('calls mount handler with the correct parameters', async () => {
    const app1 = mounters.get('app1')!;

    await navigate('/app/app1');

    expect(app1.mounter.mount).toHaveBeenCalledTimes(1);
    expect(app1.mounter.mount).toHaveBeenCalledWith(
      expect.objectContaining({
        appBasePath: '/app/app1',
        theme$,
      })
    );
  });

  it('calls mount handler and returned unmount function when navigating between apps', async () => {
    const app1 = mounters.get('app1')!;
    const app2 = mounters.get('app2')!;
    let dom = await navigate('/app/app1');

    expect(app1.mounter.mount).toHaveBeenCalled();
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /app/app1
      html: <span>App 1</span>
      </div></div>"
    `);

    const app1Unmount = await getUnmounter(app1);
    dom = await navigate('/app/app2');

    expect(app1Unmount).toHaveBeenCalled();
    expect(app2.mounter.mount).toHaveBeenCalled();
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /app/app2
      html: <div>App 2</div>
      </div></div>"
    `);
  });

  it('can navigate between standard application and one with custom appRoute', async () => {
    const standardApp = mounters.get('app1')!;
    const chromelessApp = mounters.get('app3')!;
    let dom = await navigate('/app/app1');

    expect(standardApp.mounter.mount).toHaveBeenCalled();
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /app/app1
      html: <span>App 1</span>
      </div></div>"
    `);

    const standardAppUnmount = await getUnmounter(standardApp);
    dom = await navigate('/chromeless-a/path');

    expect(standardAppUnmount).toHaveBeenCalled();
    expect(chromelessApp.mounter.mount).toHaveBeenCalled();
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /chromeless-a/path
      html: <div>Chromeless A</div>
      </div></div>"
    `);

    const chromelessAppUnmount = await getUnmounter(standardApp);
    dom = await navigate('/app/app1');

    expect(chromelessAppUnmount).toHaveBeenCalled();
    expect(standardApp.mounter.mount).toHaveBeenCalledTimes(2);
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /app/app1
      html: <span>App 1</span>
      </div></div>"
    `);
  });

  it('can navigate between two applications with custom appRoutes', async () => {
    const chromelessAppA = mounters.get('app3')!;
    const chromelessAppB = mounters.get('app4')!;
    let dom = await navigate('/chromeless-a/path');

    expect(chromelessAppA.mounter.mount).toHaveBeenCalled();
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /chromeless-a/path
      html: <div>Chromeless A</div>
      </div></div>"
    `);

    const chromelessAppAUnmount = await getUnmounter(chromelessAppA);
    dom = await navigate('/chromeless-b/path');

    expect(chromelessAppAUnmount).toHaveBeenCalled();
    expect(chromelessAppB.mounter.mount).toHaveBeenCalled();
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /chromeless-b/path
      html: <div>Chromeless B</div>
      </div></div>"
    `);

    const chromelessAppBUnmount = await getUnmounter(chromelessAppB);
    dom = await navigate('/chromeless-a/path');

    expect(chromelessAppBUnmount).toHaveBeenCalled();
    expect(chromelessAppA.mounter.mount).toHaveBeenCalledTimes(2);
    expect(dom?.html()).toMatchInlineSnapshot(`
      "<span class=\\"euiLoadingElastic euiLoadingElastic--xxLarge appContainer__loading\\" aria-label=\\"Loading application\\"><span data-euiicon-type=\\"logoElastic\\"></span></span><div class=\\"kbnAppWrapper\\" aria-busy=\\"false\\"><div>
      basename: /chromeless-a/path
      html: <div>Chromeless A</div>
      </div></div>"
    `);
  });

  it('should not mount when partial route path matches', async () => {
    mounters.set(
      ...createAppMounter({
        appId: 'spaces',
        html: '<div>Custom Space</div>',
        appRoute: '/spaces/fake-login',
      })
    );
    mounters.set(
      ...createAppMounter({
        appId: 'login',
        html: '<div>Login Page</div>',
        appRoute: '/fake-login',
      })
    );
    globalHistory = createMemoryHistory();
    update = createMountersRenderer();

    await navigate('/fake-login');

    expect(mounters.get('spaces')!.mounter.mount).not.toHaveBeenCalled();
    expect(mounters.get('login')!.mounter.mount).toHaveBeenCalled();
  });

  it('should not mount when partial route path has higher specificity', async () => {
    mounters.set(
      ...createAppMounter({
        appId: 'login',
        html: '<div>Login Page</div>',
        appRoute: '/fake-login',
      })
    );
    mounters.set(
      ...createAppMounter({
        appId: 'spaces',
        html: '<div>Custom Space</div>',
        appRoute: '/spaces/fake-login',
      })
    );
    globalHistory = createMemoryHistory();
    update = createMountersRenderer();

    await navigate('/spaces/fake-login');

    expect(mounters.get('spaces')!.mounter.mount).toHaveBeenCalled();
    expect(mounters.get('login')!.mounter.mount).not.toHaveBeenCalled();
  });

  it('should mount an exact route app only when the path is an exact match', async () => {
    mounters.set(
      ...createAppMounter({
        appId: 'exactApp',
        html: '<div>exact app</div>',
        exactRoute: true,
        appRoute: '/app/exact-app',
      })
    );

    globalHistory = createMemoryHistory();
    update = createMountersRenderer();

    await navigate('/app/exact-app/some-path');

    expect(mounters.get('exactApp')!.mounter.mount).not.toHaveBeenCalled();

    await navigate('/app/exact-app');

    expect(mounters.get('exactApp')!.mounter.mount).toHaveBeenCalledTimes(1);
  });

  it('should mount an an app with a route nested in an exact route app', async () => {
    mounters.set(
      ...createAppMounter({
        appId: 'exactApp',
        html: '<div>exact app</div>',
        exactRoute: true,
        appRoute: '/app/exact-app',
      })
    );
    mounters.set(
      ...createAppMounter({
        appId: 'nestedApp',
        html: '<div>nested app</div>',
        appRoute: '/app/exact-app/another-app',
      })
    );
    globalHistory = createMemoryHistory();
    update = createMountersRenderer();

    await navigate('/app/exact-app/another-app');

    expect(mounters.get('exactApp')!.mounter.mount).not.toHaveBeenCalled();
    expect(mounters.get('nestedApp')!.mounter.mount).toHaveBeenCalledTimes(1);
  });

  it('should not remount when changing pages within app', async () => {
    const { mounter, unmount } = mounters.get('app1')!;
    await navigate('/app/app1/page1');
    expect(mounter.mount).toHaveBeenCalledTimes(1);

    // Navigating to page within app does not trigger re-render
    await navigate('/app/app1/page2');
    expect(mounter.mount).toHaveBeenCalledTimes(1);
    expect(unmount).not.toHaveBeenCalled();
  });

  it('should not remount when going back within app', async () => {
    const { mounter, unmount } = mounters.get('app1')!;
    await navigate('/app/app1/page1');
    expect(mounter.mount).toHaveBeenCalledTimes(1);

    // Hitting back button within app does not trigger re-render
    await navigate('/app/app1/page2');
    globalHistory.goBack();
    await update();
    expect(mounter.mount).toHaveBeenCalledTimes(1);
    expect(unmount).not.toHaveBeenCalled();
  });

  it('allows multiple apps with the same `/app/appXXX` appRoute prefix', async () => {
    await navigate('/app/my-app/app5/path');
    expect(mounters.get('app5')!.mounter.mount).toHaveBeenCalledTimes(1);
    expect(mounters.get('app6')!.mounter.mount).toHaveBeenCalledTimes(0);

    await navigate('/app/my-app/app6/another-path');
    expect(mounters.get('app5')!.mounter.mount).toHaveBeenCalledTimes(1);
    expect(mounters.get('app6')!.mounter.mount).toHaveBeenCalledTimes(1);
  });

  it('should not remount when when changing pages within app using hash history', async () => {
    globalHistory = createHashHistory();
    update = createMountersRenderer();

    const { mounter, unmount } = mounters.get('app1')!;
    await navigate('/app/app1/page1');
    expect(mounter.mount).toHaveBeenCalledTimes(1);

    // Changing hash history does not trigger re-render
    await navigate('/app/app1/page2');
    expect(mounter.mount).toHaveBeenCalledTimes(1);
    expect(unmount).not.toHaveBeenCalled();
  });

  it('should unmount when changing between apps', async () => {
    const { mounter, unmount } = mounters.get('app1')!;
    await navigate('/app/app1/page1');
    expect(mounter.mount).toHaveBeenCalledTimes(1);

    // Navigating to other app triggers unmount
    await navigate('/app/app2/page1');
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('pushes global history changes to inner scoped history', async () => {
    const scopedApp = mounters.get('scopedApp');
    await navigate('/app/scopedApp');

    // Verify that internal app's redirect propagated
    expect(scopedApp?.mounter.mount).toHaveBeenCalledTimes(1);
    expect(scopedAppHistory.location.pathname).toEqual('/subpath');
    expect(globalHistory.location.pathname).toEqual('/app/scopedApp/subpath');

    // Simulate user clicking on navlink again to return to app root
    globalHistory.push('/app/scopedApp');
    // Should not call mount again
    expect(scopedApp?.mounter.mount).toHaveBeenCalledTimes(1);
    expect(scopedApp?.unmount).not.toHaveBeenCalled();
    // Inner scoped history should be synced
    expect(scopedAppHistory.location.pathname).toEqual('');

    // Make sure going back to subpath works
    globalHistory.goBack();
    expect(scopedApp?.mounter.mount).toHaveBeenCalledTimes(1);
    expect(scopedApp?.unmount).not.toHaveBeenCalled();
    expect(scopedAppHistory.location.pathname).toEqual('/subpath');
    expect(globalHistory.location.pathname).toEqual('/app/scopedApp/subpath');
  });

  it('displays error page if no app is found', async () => {
    const dom = await navigate('/app/unknown');

    expect(dom?.exists(AppNotFound)).toBe(true);
  });

  it('displays error page if app is inaccessible', async () => {
    const dom = await navigate('/app/disabledApp');

    expect(dom?.exists(AppNotFound)).toBe(true);
  });
});
