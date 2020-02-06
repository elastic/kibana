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
import { mount } from 'enzyme';

import { AppContainer } from './app_container';
import { Mounter, AppMountParameters, AppStatus } from '../types';

describe('AppContainer', () => {
  const appId = 'someApp';
  const setAppLeaveHandler = jest.fn();

  const flushPromises = async () => {
    await new Promise(async resolve => {
      setImmediate(() => resolve());
    });
  };

  const createResolver = (): [Promise<void>, () => void] => {
    let resolve: () => void | undefined;
    const promise = new Promise<void>(r => {
      resolve = r;
    });
    return [promise, resolve!];
  };

  const createMounter = (promise: Promise<void>): Mounter => ({
    appBasePath: '/base-path',
    appRoute: '/some-route',
    unmountBeforeMounting: false,
    mount: async ({ element }: AppMountParameters) => {
      await promise;
      const container = document.createElement('div');
      container.innerHTML = 'some-content';
      element.appendChild(container);
      return () => container.remove();
    },
  });

  it('should hide the "not found" page before mounting the route', async () => {
    const [waitPromise, resolvePromise] = createResolver();
    const mounter = createMounter(waitPromise);

    const wrapper = mount(
      <AppContainer
        appId={appId}
        appStatus={AppStatus.inaccessible}
        mounter={mounter}
        setAppLeaveHandler={setAppLeaveHandler}
      />
    );

    expect(wrapper.text()).toContain('Application Not Found');

    wrapper.setProps({
      appId,
      setAppLeaveHandler,
      mounter,
      appStatus: AppStatus.accessible,
    });
    wrapper.update();

    expect(wrapper.text()).toEqual('');

    resolvePromise();
    await flushPromises();
    wrapper.update();

    expect(wrapper.text()).toContain('some-content');
  });
});
