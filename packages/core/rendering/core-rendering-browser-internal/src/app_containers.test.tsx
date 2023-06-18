/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import React from 'react';

import { AppWrapper } from './app_containers';

describe('AppWrapper', () => {
  it('toggles the `hidden-chrome` class depending on the chrome visibility state', () => {
    const chromeVisible$ = new BehaviorSubject<boolean>(true);

    const component = mount(<AppWrapper chromeVisible$={chromeVisible$}>app-content</AppWrapper>);
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="kbnAppWrapper"
        data-test-subj="kbnAppWrapper visibleChrome"
      >
        app-content
      </div>
    `);

    act(() => chromeVisible$.next(false));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="kbnAppWrapper kbnAppWrapper--hiddenChrome"
        data-test-subj="kbnAppWrapper hiddenChrome"
      >
        app-content
      </div>
    `);

    act(() => chromeVisible$.next(true));
    component.update();
    expect(component.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="kbnAppWrapper"
        data-test-subj="kbnAppWrapper visibleChrome"
      >
        app-content
      </div>
    `);
  });
});
