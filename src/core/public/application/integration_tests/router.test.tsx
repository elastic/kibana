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
import { mount, ReactWrapper } from 'enzyme';
import { createMemoryHistory, History } from 'history';
import { BehaviorSubject } from 'rxjs';

import { I18nProvider } from '@kbn/i18n/react';

import { AppMount, LegacyApp, AppMountParameters } from '../types';
import { httpServiceMock } from '../../http/http_service.mock';
import { AppRouter, AppNotFound } from '../ui';

const createMountHandler = (htmlString: string) =>
  jest.fn(async ({ appBasePath: basename, element: el }: AppMountParameters) => {
    el.innerHTML = `<div>\nbasename: ${basename}\nhtml: ${htmlString}\n</div>`;
    return jest.fn(() => (el.innerHTML = ''));
  });

describe('AppContainer', () => {
  let apps: Map<string, jest.Mock<ReturnType<AppMount>, Parameters<AppMount>>>;
  let legacyApps: Map<string, LegacyApp>;
  let history: History;
  let router: ReactWrapper;
  let redirectTo: jest.Mock<void, [string]>;
  let currentAppId$: BehaviorSubject<string | undefined>;

  const navigate = async (path: string) => {
    history.push(path);
    router.update();
    // flushes any pending promises
    return new Promise(resolve => setImmediate(resolve));
  };

  beforeEach(() => {
    redirectTo = jest.fn();
    apps = new Map([
      ['app1', createMountHandler('<span>App 1</span>')],
      ['app2', createMountHandler('<div>App 2</div>')],
    ]);
    legacyApps = new Map([
      ['legacyApp1', { id: 'legacyApp1' }],
      ['baseApp:legacyApp2', { id: 'baseApp:legacyApp2' }],
    ]) as Map<string, LegacyApp>;
    history = createMemoryHistory();
    currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    // Use 'asdf' as the basepath
    const http = httpServiceMock.createStartContract({ basePath: '/asdf' });
    router = mount(
      <I18nProvider>
        <AppRouter
          redirectTo={redirectTo}
          history={history}
          apps={apps}
          legacyApps={legacyApps}
          basePath={http.basePath}
          currentAppId$={currentAppId$}
        />
      </I18nProvider>
    );
  });

  it('calls mountHandler and returned unmount function when navigating between apps', async () => {
    await navigate('/app/app1');
    expect(apps.get('app1')!).toHaveBeenCalled();
    expect(router.html()).toMatchInlineSnapshot(`
      "<div><div>
      basename: /asdf/app/app1
      html: <span>App 1</span>
      </div></div>"
    `);

    const app1Unmount = await apps.get('app1')!.mock.results[0].value;
    await navigate('/app/app2');
    expect(app1Unmount).toHaveBeenCalled();

    expect(apps.get('app2')!).toHaveBeenCalled();
    expect(router.html()).toMatchInlineSnapshot(`
      "<div><div>
      basename: /asdf/app/app2
      html: <div>App 2</div>
      </div></div>"
    `);
  });

  it('updates currentApp$ after mounting', async () => {
    await navigate('/app/app1');
    expect(currentAppId$.value).toEqual('app1');
    await navigate('/app/app2');
    expect(currentAppId$.value).toEqual('app2');
  });

  it('sets window.location.href when navigating to legacy apps', async () => {
    await navigate('/app/legacyApp1');
    expect(redirectTo).toHaveBeenCalledWith('/asdf/app/legacyApp1');
  });

  it('handles legacy apps with subapps', async () => {
    await navigate('/app/baseApp');
    expect(redirectTo).toHaveBeenCalledWith('/asdf/app/baseApp');
  });

  it('displays error page if no app is found', async () => {
    await navigate('/app/unknown');
    expect(router.exists(AppNotFound)).toBe(true);
  });
});
