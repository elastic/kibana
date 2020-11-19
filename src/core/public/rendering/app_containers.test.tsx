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

import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import React from 'react';

import { AppWrapper, AppContainer } from './app_containers';

describe('AppWrapper', () => {
  it('toggles the `hidden-chrome` class depending on the chrome visibility state', () => {
    const chromeVisible$ = new BehaviorSubject<boolean>(true);

    const component = mount(<AppWrapper chromeVisible$={chromeVisible$}>app-content</AppWrapper>);
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="app-wrapper"
      >
        app-content
      </div>
    `);

    act(() => chromeVisible$.next(false));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="app-wrapper hidden-chrome"
      >
        app-content
      </div>
    `);

    act(() => chromeVisible$.next(true));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="app-wrapper"
      >
        app-content
      </div>
    `);
  });
});

describe('AppContainer', () => {
  it('adds classes supplied by chrome', () => {
    const appClasses$ = new BehaviorSubject<string[]>([]);

    const component = mount(<AppContainer classes$={appClasses$}>app-content</AppContainer>);
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="application"
      >
        app-content
      </div>
    `);

    act(() => appClasses$.next(['classA', 'classB']));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="application classA classB"
      >
        app-content
      </div>
    `);

    act(() => appClasses$.next(['classC']));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="application classC"
      >
        app-content
      </div>
    `);

    act(() => appClasses$.next([]));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="application"
      >
        app-content
      </div>
    `);
  });
});
