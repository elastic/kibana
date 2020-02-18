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

import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { createMemoryHistory, History } from 'history';
import { createKbnUrlTracker, KbnUrlTracker } from './kbn_url_tracker';
import { BehaviorSubject, Subject } from 'rxjs';
import { AppBase, ToastsSetup } from 'kibana/public';
import { coreMock } from '../../../../../core/public/mocks';
import { unhashUrl } from './hash_unhash_url';

jest.mock('./hash_unhash_url', () => ({
  unhashUrl: jest.fn(x => x),
}));

describe('kbnUrlTracker', () => {
  let storage: StubBrowserStorage;
  let history: History;
  let urlTracker: KbnUrlTracker;
  let state1Subject: Subject<{ key1: string }>;
  let state2Subject: Subject<{ key2: string }>;
  let navLinkUpdaterSubject: BehaviorSubject<(app: AppBase) => { activeUrl?: string } | undefined>;
  let toastService: jest.Mocked<ToastsSetup>;

  function createTracker() {
    urlTracker = createKbnUrlTracker({
      baseUrl: '/app/test',
      defaultSubUrl: '#/start',
      storageKey: 'storageKey',
      history,
      storage,
      stateParams: [
        {
          kbnUrlKey: 'state1',
          stateUpdate$: state1Subject.asObservable(),
        },
        {
          kbnUrlKey: 'state2',
          stateUpdate$: state2Subject.asObservable(),
        },
      ],
      navLinkUpdater$: navLinkUpdaterSubject,
      toastNotifications: toastService,
    });
  }

  function getActiveNavLinkUrl() {
    return navLinkUpdaterSubject.getValue()({} as AppBase)?.activeUrl;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    toastService = coreMock.createSetup().notifications.toasts;
    storage = new StubBrowserStorage();
    history = createMemoryHistory();
    state1Subject = new Subject<{ key1: string }>();
    state2Subject = new Subject<{ key2: string }>();
    navLinkUpdaterSubject = new BehaviorSubject<
      (app: AppBase) => { activeUrl?: string } | undefined
    >(() => undefined);
  });

  test('do not touch nav link to default if nothing else is set', () => {
    createTracker();
    expect(getActiveNavLinkUrl()).toEqual(undefined);
  });

  test('set nav link to session storage value if defined', () => {
    storage.setItem('storageKey', '#/deep/path');
    createTracker();
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/deep/path');
  });

  test('set nav link to default if app gets mounted', () => {
    storage.setItem('storageKey', '#/deep/path');
    createTracker();
    urlTracker.appMounted();
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/start');
  });

  test('keep nav link to default if path gets changed while app mounted', () => {
    storage.setItem('storageKey', '#/deep/path');
    createTracker();
    urlTracker.appMounted();
    history.push('/deep/path/2');
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/start');
  });

  test('change nav link to last visited url within app after unmount', () => {
    createTracker();
    urlTracker.appMounted();
    history.push('/deep/path/2');
    history.push('/deep/path/3');
    urlTracker.appUnMounted();
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/deep/path/3');
  });

  test('unhash all urls that are recorded while app is mounted', () => {
    (unhashUrl as jest.Mock).mockImplementation(x => x + '?unhashed');
    createTracker();
    urlTracker.appMounted();
    history.push('/deep/path/2');
    history.push('/deep/path/3');
    urlTracker.appUnMounted();
    expect(unhashUrl).toHaveBeenCalledTimes(2);
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/deep/path/3?unhashed');
  });

  test('show warning and use hashed url if unhashing does not work', () => {
    (unhashUrl as jest.Mock).mockImplementation(() => {
      throw new Error('unhash broke');
    });
    createTracker();
    urlTracker.appMounted();
    history.push('/deep/path/2');
    urlTracker.appUnMounted();
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/deep/path/2');
    expect(toastService.addDanger).toHaveBeenCalledWith('unhash broke');
  });

  test('change nav link back to default if app gets mounted again', () => {
    createTracker();
    urlTracker.appMounted();
    history.push('/deep/path/2');
    history.push('/deep/path/3');
    urlTracker.appUnMounted();
    urlTracker.appMounted();
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/start');
  });

  test('update state param when app is not mounted', () => {
    createTracker();
    state1Subject.next({ key1: 'abc' });
    expect(getActiveNavLinkUrl()).toMatchInlineSnapshot(`"/app/test#/start?state1=(key1:abc)"`);
  });

  test('update state param without overwriting rest of the url when app is not mounted', () => {
    storage.setItem('storageKey', '#/deep/path?extrastate=1');
    createTracker();
    state1Subject.next({ key1: 'abc' });
    expect(getActiveNavLinkUrl()).toMatchInlineSnapshot(
      `"/app/test#/deep/path?extrastate=1&state1=(key1:abc)"`
    );
  });

  test('not update state param when app is mounted', () => {
    createTracker();
    urlTracker.appMounted();
    state1Subject.next({ key1: 'abc' });
    expect(getActiveNavLinkUrl()).toEqual('/app/test#/start');
  });

  test('update state param multiple times when app is not mounted', () => {
    createTracker();
    state1Subject.next({ key1: 'abc' });
    state1Subject.next({ key1: 'def' });
    expect(getActiveNavLinkUrl()).toMatchInlineSnapshot(`"/app/test#/start?state1=(key1:def)"`);
  });

  test('update multiple state params when app is not mounted', () => {
    createTracker();
    state1Subject.next({ key1: 'abc' });
    state2Subject.next({ key2: 'def' });
    expect(getActiveNavLinkUrl()).toMatchInlineSnapshot(
      `"/app/test#/start?state1=(key1:abc)&state2=(key2:def)"`
    );
  });

  test('set url to storage when setActiveUrl was called', () => {
    createTracker();
    urlTracker.setActiveUrl('/deep/path/4');
    expect(storage.getItem('storageKey')).toEqual('#/deep/path/4');
  });
});
