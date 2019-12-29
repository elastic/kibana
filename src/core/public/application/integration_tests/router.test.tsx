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
import { createMemoryHistory, History } from 'history';

import { AppRouter, AppNotFound } from '../ui';
import { EitherApp, MockedMounterMap, MockedMounterTuple } from '../test_types';
import { createRenderer, createAppMounter, createLegacyAppMounter } from './utils';

describe('AppContainer', () => {
  let mounters: MockedMounterMap<EitherApp>;
  let history: History;
  let navigate: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    mounters = new Map([
      createAppMounter('app1', '<span>App 1</span>'),
      createLegacyAppMounter('legacyApp1', jest.fn()),
      createAppMounter('app2', '<div>App 2</div>'),
      createLegacyAppMounter('baseApp:legacyApp2', jest.fn()),
      createAppMounter('app3', '<div>App 3</div>', '/custom/path'),
    ] as Array<MockedMounterTuple<EitherApp>>);
    history = createMemoryHistory();
    navigate = createRenderer(<AppRouter history={history} mounters={mounters} />, history.push);
  });

  it('calls mount handler and returned unmount function when navigating between apps', async () => {
    const dom1 = await navigate('/app/app1');
    const app1 = mounters.get('app1')!;

    expect(app1.mount).toHaveBeenCalled();
    expect(dom1?.html()).toMatchInlineSnapshot(`
      "<div><div>
      basename: /app/app1
      html: <span>App 1</span>
      </div></div>"
    `);

    const app1Unmount = await app1.mount.mock.results[0].value;
    const dom2 = await navigate('/app/app2');

    expect(app1Unmount).toHaveBeenCalled();
    expect(mounters.get('app2')!.mount).toHaveBeenCalled();
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
    navigate = createRenderer(<AppRouter history={history} mounters={mounters} />, history.push);

    await navigate('/fake-login');

    expect(mounters.get('spaces')!.mount).not.toHaveBeenCalled();
    expect(mounters.get('login')!.mount).toHaveBeenCalled();
  });

  it('should not mount when partial route path has higher specificity', async () => {
    mounters.set(...createAppMounter('login', '<div>Login Page</div>', '/fake-login'));
    mounters.set(...createAppMounter('spaces', '<div>Custom Space</div>', '/spaces/fake-login'));
    history = createMemoryHistory();
    navigate = createRenderer(<AppRouter history={history} mounters={mounters} />, history.push);

    await navigate('/spaces/fake-login');

    expect(mounters.get('spaces')!.mount).toHaveBeenCalled();
    expect(mounters.get('login')!.mount).not.toHaveBeenCalled();
  });

  it('calls legacy mount handler', async () => {
    await navigate('/app/legacyApp1');
    expect(mounters.get('legacyApp1')!.mount.mock.calls[0]).toMatchInlineSnapshot(`
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
    expect(mounters.get('baseApp:legacyApp2')!.mount.mock.calls[0]).toMatchInlineSnapshot(`
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
