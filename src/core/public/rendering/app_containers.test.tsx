/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
