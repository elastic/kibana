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

import React from 'react';
import { createMemoryHistory, History, createHashHistory } from 'history';

import { AppRouter, AppNotFound } from '../ui';
import { EitherApp, MockedMounterMap, MockedMounterTuple } from '../test_types';
import { createRenderer, createAppMounter, createLegacyAppMounter } from './utils';

describe('AppContainer', () => {
  let mounters: MockedMounterMap<EitherApp>;
  let history: History;
  let update: ReturnType<typeof createRenderer>;

  const navigate = (path: string) => {
    history.push(path);
    return update();
  };

  const mockMountersToMounters = () =>
    new Map([...mounters].map(([appId, { mounter }]) => [appId, mounter]));

  beforeEach(() => {
    mounters = new Map([
      createAppMounter('app1', '<span>App 1</span>'),
      createLegacyAppMounter('legacyApp1', jest.fn()),
      createAppMounter('app2', '<div>App 2</div>'),
      createLegacyAppMounter('baseApp:legacyApp2', jest.fn()),
      createAppMounter('app3', '<div>App 3</div>', '/custom/path'),
    ] as Array<MockedMounterTuple<EitherApp>>);
    history = createMemoryHistory();
    update = createRenderer(<AppRouter history={history} mounters={mockMountersToMounters()} />);
  });

  it('calls mount handler and returned unmount function when navigating between apps', async () => {
    const dom1 = await navigate('/app/app1');
    const app1 = mounters.get('app1')!;

    expect(app1.mounter.mount).toHaveBeenCalled();
    expect(dom1?.html()).toMatchInlineSnapshot(`
      "<div><div>
      basename: /app/app1
      html: <span>App 1</span>
      </div></div>"
    `);

    const app1Unmount = await app1.mounter.mount.mock.results[0].value;
    const dom2 = await navigate('/app/app2');

    expect(app1Unmount).toHaveBeenCalled();
    expect(mounters.get('app2')!.mounter.mount).toHaveBeenCalled();
    expect(dom2?.html()).toMatchInlineSnapshot(`
      "<div><div>
      basename: /app/app2
      html: <div>App 2</div>
      </div></div>"
    `);
  });

  it('should not mount when partial route path matches', async () => {
    mounters.set(...createAppMounter('spaces', '<div>Custom Space</div>', '/spaces/fake-login'));
    mounters.set(...createAppMounter('login', '<div>Login Page</div>', '/fake-login'));
    history = createMemoryHistory();
    update = createRenderer(<AppRouter history={history} mounters={mockMountersToMounters()} />);

    await navigate('/fake-login');

    expect(mounters.get('spaces')!.mounter.mount).not.toHaveBeenCalled();
    expect(mounters.get('login')!.mounter.mount).toHaveBeenCalled();
  });

  it('should not mount when partial route path has higher specificity', async () => {
    mounters.set(...createAppMounter('login', '<div>Login Page</div>', '/fake-login'));
    mounters.set(...createAppMounter('spaces', '<div>Custom Space</div>', '/spaces/fake-login'));
    history = createMemoryHistory();
    update = createRenderer(<AppRouter history={history} mounters={mockMountersToMounters()} />);

    await navigate('/spaces/fake-login');

    expect(mounters.get('spaces')!.mounter.mount).toHaveBeenCalled();
    expect(mounters.get('login')!.mounter.mount).not.toHaveBeenCalled();
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
    history.goBack();
    await update();
    expect(mounter.mount).toHaveBeenCalledTimes(1);
    expect(unmount).not.toHaveBeenCalled();
  });

  it('should not remount when when changing pages within app using hash history', async () => {
    history = createHashHistory();
    update = createRenderer(<AppRouter history={history} mounters={mockMountersToMounters()} />);

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

  it('calls legacy mount handler', async () => {
    await navigate('/app/legacyApp1');
    expect(mounters.get('legacyApp1')!.mounter.mount.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "appBasePath": "/app/legacyApp1",
          "element": <div />,
        },
      ]
    `);
  });

  it('handles legacy apps with subapps', async () => {
    await navigate('/app/baseApp');
    expect(mounters.get('baseApp:legacyApp2')!.mounter.mount.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "appBasePath": "/app/baseApp",
          "element": <div />,
        },
      ]
    `);
  });

  it('displays error page if no app is found', async () => {
    const dom = await navigate('/app/unknown');

    expect(dom?.exists(AppNotFound)).toBe(true);
  });
});
