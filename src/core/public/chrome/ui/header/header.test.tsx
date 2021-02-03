/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import { StubBrowserStorage, mountWithIntl } from '@kbn/test/jest';
import { httpServiceMock } from '../../../http/http_service.mock';
import { applicationServiceMock } from '../../../mocks';
import { Header } from './header';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

function mockProps() {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });
  const application = applicationServiceMock.createInternalStartContract();

  return {
    application,
    kibanaVersion: '1.0.0',
    appTitle$: new BehaviorSubject('test'),
    badge$: new BehaviorSubject(undefined),
    breadcrumbs$: new BehaviorSubject([]),
    breadcrumbsAppendExtension$: new BehaviorSubject(undefined),
    homeHref: '/',
    isVisible$: new BehaviorSubject(true),
    kibanaDocLink: '/docs',
    navLinks$: new BehaviorSubject([]),
    customNavLink$: new BehaviorSubject(undefined),
    recentlyAccessed$: new BehaviorSubject([]),
    forceAppSwitcherNavigation$: new BehaviorSubject(false),
    helpExtension$: new BehaviorSubject(undefined),
    helpSupportUrl$: new BehaviorSubject(''),
    navControlsLeft$: new BehaviorSubject([]),
    navControlsCenter$: new BehaviorSubject([]),
    navControlsRight$: new BehaviorSubject([]),
    basePath: http.basePath,
    isLocked$: new BehaviorSubject(false),
    loadingCount$: new BehaviorSubject(0),
    onIsLockedUpdate: () => {},
  };
}

describe('Header', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: new StubBrowserStorage(),
    });
  });

  it('renders', () => {
    const isVisible$ = new BehaviorSubject(false);
    const breadcrumbs$ = new BehaviorSubject([{ text: 'test' }]);
    const isLocked$ = new BehaviorSubject(false);
    const navLinks$ = new BehaviorSubject([
      { id: 'kibana', title: 'kibana', baseUrl: '', href: '' },
    ]);
    const customNavLink$ = new BehaviorSubject({
      id: 'cloud-deployment-link',
      title: 'Manage cloud deployment',
      baseUrl: '',
      href: '',
    });
    const recentlyAccessed$ = new BehaviorSubject([
      { link: '', label: 'dashboard', id: 'dashboard' },
    ]);
    const component = mountWithIntl(
      <Header
        {...mockProps()}
        isVisible$={isVisible$}
        breadcrumbs$={breadcrumbs$}
        navLinks$={navLinks$}
        recentlyAccessed$={recentlyAccessed$}
        isLocked$={isLocked$}
        customNavLink$={customNavLink$}
      />
    );
    expect(component.find('EuiHeader').exists()).toBeFalsy();

    act(() => isVisible$.next(true));
    component.update();
    expect(component.find('EuiHeader').exists()).toBeTruthy();
    expect(component.find('nav[aria-label="Primary"]').exists()).toBeFalsy();

    act(() => isLocked$.next(true));
    component.update();
    expect(component.find('nav[aria-label="Primary"]').exists()).toBeTruthy();
    expect(component).toMatchSnapshot();
  });
});
