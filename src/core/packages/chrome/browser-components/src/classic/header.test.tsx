/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StubBrowserStorage, mountWithIntl, renderWithI18n } from '@kbn/test-jest-helpers';
import type { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { CHROME_HEADER_TEST_SUBJECTS } from '../test_subjects';
import { ClassicHeader } from './header';

describe('Header', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: new StubBrowserStorage(),
    });
  });

  it('renders', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();

    const breadcrumbs$ = new BehaviorSubject([{ text: 'test' }]);
    chrome.getBreadcrumbs$.mockReturnValue(breadcrumbs$);
    chrome.getBreadcrumbs.mockReturnValue([{ text: 'test' }]);

    const customNavLink$ = new BehaviorSubject({
      id: 'cloud-deployment-link',
      title: 'Manage cloud deployment',
      baseUrl: '',
      url: '',
      href: '',
      visibleIn: ['globalSearch' as const],
    });
    chrome.getCustomNavLink$.mockReturnValue(customNavLink$);

    const recentlyAccessed$ = new BehaviorSubject([
      { link: '', label: 'dashboard', id: 'dashboard' },
    ]);
    chrome.recentlyAccessed.get$.mockReturnValue(recentlyAccessed$);

    chrome.navLinks.getNavLinks$.mockReturnValue(
      new BehaviorSubject([
        {
          id: 'kibana',
          title: 'kibana',
          baseUrl: '',
          href: '',
          url: '',
          visibleIn: ['globalSearch' as const],
        },
      ])
    );

    const breadcrumbsAppendExtensions$ = new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>(
      []
    );
    chrome.getBreadcrumbsAppendExtensionsWithBadges$.mockReturnValue(breadcrumbsAppendExtensions$);

    const component = mountWithIntl(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ClassicHeader />
      </TestChromeProviders>
    );
    expect(component.find('EuiHeader').exists()).toBeTruthy();
    expect(component.find('nav[aria-label="Primary"]').exists()).toBeFalsy();
    expect(component.render()).toMatchSnapshot();

    act(() =>
      breadcrumbsAppendExtensions$.next([
        { content: <div className="my-extension1">__render__</div> },
        { content: <div className="my-extension2">__render__</div> },
      ])
    );
    component.update();
    const rootNode = component.find('[data-test-subj="headerGlobalNav"]').getDOMNode();
    expect(rootNode.querySelector('.my-extension1')).toBeTruthy();
    expect(rootNode.querySelector('.my-extension2')).toBeTruthy();
  });

  it('keeps the help menu open when the subscription badge resolves', async () => {
    const chrome = chromeServiceMock.createStartContract();

    renderWithI18n(
      <TestChromeProviders chrome={chrome}>
        <ClassicHeader />
      </TestChromeProviders>
    );

    await userEvent.click(screen.getByTestId(CHROME_HEADER_TEST_SUBJECTS.helpButton));
    expect(screen.getByText('Kibana documentation')).toBeInTheDocument();

    act(() => {
      chrome.controls.subscriptionBadge.set(<span>Basic</span>);
    });

    expect(screen.getByTestId(CHROME_HEADER_TEST_SUBJECTS.subscriptionBadge)).toHaveTextContent(
      'Basic'
    );
    expect(screen.getByText('Kibana documentation')).toBeInTheDocument();
  });
});
