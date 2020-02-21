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

import moment from 'moment';
import { coreMock } from '../../../core/public/mocks';
import { plugin } from './';
import { LOCALSTORAGE_KEY } from './constants';

function getHandler(spy: jest.SpyInstance, event: string) {
  const [, handlerCb] = spy.mock.calls.find(([method, fn]) => method === event) || [];
  return handlerCb;
}

describe('ApplicationUsagePlugin/public', () => {
  const locationSpy = jest.spyOn(window, 'location', 'get');
  const windowAddListenerSpy = jest.spyOn(window, 'addEventListener');
  const documentAddListenerSpy = jest.spyOn(document, 'addEventListener');
  const visibilityStateSpy = jest.spyOn(document, 'visibilityState', 'get');

  const appUsagePlugin = plugin();

  const localStorageSpy = {
    get: jest.spyOn((appUsagePlugin as any).localStorage, 'get'),
    set: jest.spyOn((appUsagePlugin as any).localStorage, 'set'),
    remove: jest.spyOn((appUsagePlugin as any).localStorage, 'remove'),
  };

  appUsagePlugin.setup(coreMock.createSetup());
  const coreStart = coreMock.createStart();
  const {
    __LEGACY: { appChanged },
  } = appUsagePlugin.start(coreStart);

  const beforeunloadCb = getHandler(windowAddListenerSpy, 'beforeunload');
  const hashchangeCb = getHandler(windowAddListenerSpy, 'hashchange');
  const clickCb = getHandler(windowAddListenerSpy, 'click');
  const visibilitychangeCb = getHandler(documentAddListenerSpy, 'visibilitychange');

  beforeEach(() => {
    localStorageSpy.get.mockReset();
    localStorageSpy.set.mockReset();
    localStorageSpy.remove.mockReset();
    visibilityStateSpy.mockReset();
  });

  test('all listeners are initialised', () => {
    expect(beforeunloadCb).toBeInstanceOf(Function);
    expect(hashchangeCb).toBeInstanceOf(Function);
    expect(clickCb).toBeInstanceOf(Function);
    expect(visibilitychangeCb).toBeInstanceOf(Function);
  });

  test('visibilitychange handler => back to visible', () => {
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    expect((appUsagePlugin as any).lastAppId).toBeUndefined();
    visibilityStateSpy.mockReturnValue('visible');
    visibilitychangeCb();
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    expect(localStorageSpy.set).not.toHaveBeenCalled();
  });

  test('the currentUsage should be initially undefined until an app is changed', () => {
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    appChanged('test-app');
    expect((appUsagePlugin as any).lastAppId).toBe('test-app');
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'test-app',
      startTime: expect.any(moment),
      numberOfClicks: 0,
    });
  });

  test('beforeunload handler => it should clean the currentUsage and update the localStorage', () => {
    expect((appUsagePlugin as any).currentUsage).not.toBeUndefined();
    beforeunloadCb();
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    expect(localStorageSpy.set).toHaveBeenLastCalledWith(LOCALSTORAGE_KEY, {
      'test-app': {
        numberOfClicks: 0,
        minutesOnScreen: expect.any(Number),
      },
    });
  });

  test('hashchange handler => when no app is around', () => {
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    hashchangeCb();
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    expect(localStorageSpy.set).not.toHaveBeenCalled();
  });

  test('hashchange handler => when there is an "infra" app', () => {
    // Infra app but no hash => nothing to call
    appChanged('infra');
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
    expect(localStorageSpy.set).not.toHaveBeenCalled();
  });

  test('hashchange handler => when there is an "infra" app (and hash)', () => {
    locationSpy.mockReturnValue({ hash: '#/test/' } as any);

    // Infra app with hash => set the currentUsage
    appChanged('infra');
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'test',
      numberOfClicks: 0,
      startTime: expect.any(moment),
    });
    expect(localStorageSpy.set).not.toHaveBeenCalled();
  });

  test('hashchange handler => when there is an "infra" app (and no hash change)', () => {
    locationSpy.mockReturnValue({ hash: '#/test/' } as any);

    // No change in the hash, so nothing else should be done
    hashchangeCb();
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'test',
      numberOfClicks: 0,
      startTime: expect.any(moment),
    });
    expect(localStorageSpy.set).not.toHaveBeenCalled();
  });

  test('hashchange handler => when there is an "infra" app (and new hash)', () => {
    locationSpy.mockReturnValue({ hash: '#/testInfraPlugin/' } as any);

    // Infra app with a new hash => set the currentUsage
    hashchangeCb();
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'testInfraPlugin',
      numberOfClicks: 0,
      startTime: expect.any(moment),
    });
    expect(localStorageSpy.set).toHaveBeenLastCalledWith(LOCALSTORAGE_KEY, {
      test: {
        numberOfClicks: 0,
        minutesOnScreen: expect.any(Number),
      },
    });
  });

  test('visibilitychange handler => visible', () => {
    visibilityStateSpy.mockReturnValue('visible');
    visibilitychangeCb();
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'testInfraPlugin',
      numberOfClicks: 0,
      startTime: expect.any(moment),
    });
    expect(localStorageSpy.set).toHaveBeenLastCalledWith(LOCALSTORAGE_KEY, {
      testInfraPlugin: {
        numberOfClicks: 0,
        minutesOnScreen: expect.any(Number),
      },
    });
  });

  test('visibilitychange handler => hidden', () => {
    localStorageSpy.get.mockReturnValue({ appId: { numberOfClicks: 0, minutesOnScreen: 3 } });
    expect((appUsagePlugin as any).currentUsage).not.toBeUndefined();
    visibilityStateSpy.mockReturnValue('hidden');
    visibilitychangeCb();
    expect(localStorageSpy.set).toHaveBeenLastCalledWith(LOCALSTORAGE_KEY, {
      appId: { numberOfClicks: 0, minutesOnScreen: 3 },
      testInfraPlugin: {
        numberOfClicks: 0,
        minutesOnScreen: expect.any(Number),
      },
    });
    expect((appUsagePlugin as any).currentUsage).toBeUndefined();
  });

  test('click handler', () => {
    appChanged('test');
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'test',
      numberOfClicks: 0,
      startTime: expect.any(moment),
    });
    clickCb();
    expect((appUsagePlugin as any).currentUsage).toMatchSnapshot({
      appId: 'test',
      numberOfClicks: 1,
      startTime: expect.any(moment),
    });
  });
});
