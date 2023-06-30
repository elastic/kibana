/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ScreenReaderRouteAnnouncements, SkipToMainContent } from './screen_reader_a11y';
import { mount, render } from 'enzyme';

describe('ScreenReaderRouteAnnouncements', () => {
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

  it('does not set the focusOnRegionOnTextChange for canvas', () => {
    const noFocusComponentCanvas = mount(
      <ScreenReaderRouteAnnouncements
        appId$={new BehaviorSubject('canvas')}
        customBranding$={new BehaviorSubject({})}
        breadcrumbs$={new BehaviorSubject([])}
      />
    );

    expect(
      noFocusComponentCanvas
        .debug()
        .includes('<EuiScreenReaderLive focusRegionOnTextChange={false}>')
    ).toBeTruthy();
  });

  it('sets the focusOnRegionOnTextChange to true for other apps', () => {
    const noFocusComponent = mount(
      <ScreenReaderRouteAnnouncements
        appId$={new BehaviorSubject('visualize')}
        customBranding$={new BehaviorSubject({})}
        breadcrumbs$={new BehaviorSubject([])}
      />
    );

    expect(
      noFocusComponent.debug().includes('<EuiScreenReaderLive focusRegionOnTextChange={true}>')
    ).toBeTruthy();
  });
});

describe('SkipToMainContent', () => {
  it('renders', () => {
    const component = render(<SkipToMainContent />);
    expect(component).toMatchSnapshot();
  });
});
