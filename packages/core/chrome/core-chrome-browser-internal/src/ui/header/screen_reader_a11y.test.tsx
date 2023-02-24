/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { StubBrowserStorage, mountWithIntl } from '@kbn/test-jest-helpers';
import { ScreenReaderRouteAnnouncements } from './screen_reader_a11y';

describe('Header', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: new StubBrowserStorage(),
    });
  });

  it('renders', () => {
    const component = mountWithIntl(
      <ScreenReaderRouteAnnouncements
        appId$={new BehaviorSubject('test')}
        customBranding$={new BehaviorSubject({})}
        breadcrumbs$={new BehaviorSubject([{ text: 'Visualize' }])}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
