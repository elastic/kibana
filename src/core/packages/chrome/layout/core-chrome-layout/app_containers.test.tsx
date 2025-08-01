/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { render } from '@testing-library/react';
import React from 'react';

import { AppWrapper } from './app_containers';

describe('AppWrapper', () => {
  it('toggles the `hidden-chrome` class depending on the chrome visibility state', () => {
    const chromeVisible$ = new BehaviorSubject<boolean>(true);
    const { getByTestId, rerender } = render(
      <AppWrapper chromeVisible={chromeVisible$.value}>app-content</AppWrapper>
    );

    // The data-test-subj attribute is used for querying
    expect(getByTestId('kbnAppWrapper visibleChrome')).toMatchInlineSnapshot(`
      <div
        class="kbnAppWrapper"
        data-test-subj="kbnAppWrapper visibleChrome"
      >
        app-content
      </div>
    `);

    act(() => chromeVisible$.next(false));
    rerender(<AppWrapper chromeVisible={chromeVisible$.value}>app-content</AppWrapper>);
    expect(getByTestId('kbnAppWrapper hiddenChrome')).toMatchInlineSnapshot(`
      <div
        class="kbnAppWrapper kbnAppWrapper--hiddenChrome"
        data-test-subj="kbnAppWrapper hiddenChrome"
      >
        app-content
      </div>
    `);

    act(() => chromeVisible$.next(true));
    rerender(<AppWrapper chromeVisible={chromeVisible$.value}>app-content</AppWrapper>);
    expect(getByTestId('kbnAppWrapper visibleChrome')).toMatchInlineSnapshot(`
      <div
        class="kbnAppWrapper"
        data-test-subj="kbnAppWrapper visibleChrome"
      >
        app-content
      </div>
    `);
  });
});
