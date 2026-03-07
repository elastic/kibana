/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { StubBrowserStorage, mountWithIntl } from '@kbn/test-jest-helpers';
import { ChromeComponentsProvider } from '../context';
import { createMockChromeComponentsDeps } from '../test_helpers';
import { ClassicHeader } from './header';

describe('Header', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: new StubBrowserStorage(),
    });
  });

  it('renders', () => {
    const deps = createMockChromeComponentsDeps();

    deps.classic.breadcrumbs$.next([{ text: 'test' }]);
    deps.navLinks$.next([
      {
        id: 'kibana',
        title: 'kibana',
        baseUrl: '',
        href: '',
        url: '',
        visibleIn: ['globalSearch' as const],
      },
    ]);
    deps.classic.customNavLink$.next({
      id: 'cloud-deployment-link',
      title: 'Manage cloud deployment',
      baseUrl: '',
      url: '',
      href: '',
      visibleIn: ['globalSearch' as const],
    });
    deps.classic.recentlyAccessed$.next([{ link: '', label: 'dashboard', id: 'dashboard' }]);

    const component = mountWithIntl(
      <ChromeComponentsProvider value={deps}>
        <ClassicHeader />
      </ChromeComponentsProvider>
    );
    expect(component.find('EuiHeader').exists()).toBeTruthy();
    expect(component.find('nav[aria-label="Primary"]').exists()).toBeFalsy();
    expect(component.render()).toMatchSnapshot();

    act(() =>
      deps.breadcrumbsAppendExtensions$.next([
        { content: <div className="my-extension1">__render__</div> },
        { content: <div className="my-extension2">__render__</div> },
      ])
    );
    component.update();
    const rootNode = component.getDOMNode();
    expect(rootNode.querySelector('.my-extension1')).toBeTruthy();
    expect(rootNode.querySelector('.my-extension2')).toBeTruthy();
  });
});
