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
import { render, fireEvent, act } from '@testing-library/react';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeBreadcrumb, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { ChromeHeaderPageAnnouncer, HeaderPageAnnouncer } from './header_page_announcer';
import {
  getDeepestActiveNavigationTitle,
  normalizeAppHeaderTitle,
  resolveChromeHeaderAnnouncement,
} from './resolve_chrome_header_announcement';

describe('HeaderPageAnnouncer', () => {
  it('announces the page title with the default brand when no branding is provided', () => {
    const deps = createMockChromeComponentsDeps();
    render(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'Home' }]} />
      </TestChromeProviders>
    );

    expect(deps.notifications.screenReader.notify).toHaveBeenCalledWith('Home - Elastic', {
      key: 'pageTitle',
    });
  });

  it('announces the page title with custom branding', () => {
    const deps = createMockChromeComponentsDeps();
    act(() => {
      deps.customBranding.customBranding$.next({ pageTitle: 'Kibana' });
    });

    render(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'Dashboard' }]} />
      </TestChromeProviders>
    );

    expect(deps.notifications.screenReader.notify).toHaveBeenLastCalledWith('Dashboard - Kibana', {
      key: 'pageTitle',
    });
  });

  it('announces the new title when breadcrumbs change, but not the same title again', () => {
    const deps = createMockChromeComponentsDeps();
    act(() => {
      deps.customBranding.customBranding$.next({ pageTitle: 'Brand' });
    });

    const { rerender } = render(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'A' }]} />
      </TestChromeProviders>
    );
    rerender(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'B' }]} />
      </TestChromeProviders>
    );
    rerender(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'B' }]} />
      </TestChromeProviders>
    );

    expect(deps.notifications.screenReader.notify.mock.calls).toEqual([
      ['A - Brand', { key: 'pageTitle' }],
      ['B - Brand', { key: 'pageTitle' }],
    ]);
  });

  it('renders skip link', () => {
    const { getByText } = render(
      <TestChromeProviders>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'Test' }]} />
      </TestChromeProviders>
    );
    expect(getByText('Skip to main content')).toBeInTheDocument();
  });

  it('focuses skip link on TAB when shouldHandlingTab is true', () => {
    const { getByTestId } = render(
      <TestChromeProviders>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'Test' }]} />
      </TestChromeProviders>
    );
    const skipLink = getByTestId('skipToMainButton');
    skipLink.focus = jest.fn();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).toHaveBeenCalledTimes(1);
  });

  it('does not focus skip link when Tab is pressed and focus is already within main content', () => {
    const { getByTestId, getByText } = render(
      <>
        <TestChromeProviders>
          <HeaderPageAnnouncer breadcrumbs={[{ text: 'Test' }]} />
        </TestChromeProviders>
        <main>
          <button>Button in main</button>
        </main>
      </>
    );

    const skipLink = getByTestId('skipToMainButton');
    const mainButton = getByText('Button in main');

    mainButton.focus();

    skipLink.focus = jest.fn();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).not.toHaveBeenCalled();
  });

  it('does not focus skip link when Tab is pressed and focus is within role="main"', () => {
    const { getByTestId, getByText } = render(
      <>
        <TestChromeProviders>
          <HeaderPageAnnouncer breadcrumbs={[{ text: 'Test' }]} />
        </TestChromeProviders>
        <div role="main">
          <button>Button in main</button>
        </div>
      </>
    );

    const skipLink = getByTestId('skipToMainButton');
    const mainButton = getByText('Button in main');

    mainButton.focus();

    skipLink.focus = jest.fn();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).not.toHaveBeenCalled();
  });

  it('does not focus skip link when Tab is pressed and focus is within a flyout', () => {
    const { getByTestId, getByText } = render(
      <>
        <TestChromeProviders>
          <HeaderPageAnnouncer breadcrumbs={[{ text: 'Test' }]} />
        </TestChromeProviders>
        <div className="euiFlyout" role="dialog" aria-label="Flyout">
          <button>Button in flyout</button>
        </div>
      </>
    );

    const skipLink = getByTestId('skipToMainButton');
    const flyoutButton = getByText('Button in flyout');

    flyoutButton.focus();

    skipLink.focus = jest.fn();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).not.toHaveBeenCalled();
  });
});

const createNavNode = (
  id: string,
  title: string,
  extras: Partial<ChromeProjectNavigationNode> = {}
): ChromeProjectNavigationNode => ({
  id,
  path: id,
  title,
  ...extras,
});

describe('resolveChromeHeaderAnnouncement', () => {
  it('normalizes string and editable titles', () => {
    expect(normalizeAppHeaderTitle('  Dashboards  ')).toBe('Dashboards');
    expect(normalizeAppHeaderTitle({ text: '  Name  ', onSave: jest.fn() })).toBe('Name');
    expect(
      normalizeAppHeaderTitle({ text: '  ', placeholder: '  Untitled  ', onSave: jest.fn() })
    ).toBe('Untitled');
    expect(normalizeAppHeaderTitle('   ')).toBeUndefined();
  });

  it('selects one deepest navigation title and ignores breadcrumbStatus', () => {
    expect(
      getDeepestActiveNavigationTitle([
        [
          createNavNode('root', 'Observability'),
          createNavNode('leaf', 'Workflows', { breadcrumbStatus: 'hidden' }),
        ],
      ])
    ).toBe('Workflows');
  });

  it('does not join the full active navigation path', () => {
    expect(
      resolveChromeHeaderAnnouncement({
        activeNodes: [[createNavNode('root', 'Observability'), createNavNode('leaf', 'Alerts')]],
      })
    ).toBe('Alerts');
  });

  it('uses only the first document-title segment so breadcrumb-style titles do not re-announce', () => {
    expect(
      resolveChromeHeaderAnnouncement({
        docTitleParts: ['SLOs', 'Observability', 'Elastic'],
        activeNodes: [[createNavNode('root', 'Observability'), createNavNode('leaf', 'SLOs')]],
      })
    ).toBe('SLOs');
  });

  it('keeps a document-title part that contains the display separator', () => {
    expect(
      resolveChromeHeaderAnnouncement({
        docTitleParts: ['CPU - Memory', 'Elastic'],
      })
    ).toBe('CPU - Memory');
  });

  it('falls through a brand-only or empty first document-title part to the navigation title', () => {
    expect(
      resolveChromeHeaderAnnouncement({
        docTitleParts: ['Elastic'],
        activeNodes: [[createNavNode('leaf', 'Workflows')]],
      })
    ).toBe('Workflows');
    expect(
      resolveChromeHeaderAnnouncement({
        docTitleParts: ['  ', 'Elastic'],
        activeNodes: [[createNavNode('leaf', 'Workflows')]],
      })
    ).toBe('Workflows');
  });
});

describe('ChromeHeaderPageAnnouncer', () => {
  const flushAnnouncement = () => {
    act(() => {
      jest.runAllTimers();
    });
  };

  const createHarness = () => {
    const chrome = chromeServiceMock.createStartContract();
    const deps = createMockChromeComponentsDeps();
    const currentLocation$ = deps.application.currentLocation$ as BehaviorSubject<string>;
    const docTitleParts$ = chrome.componentDeps.docTitleParts$ as unknown as BehaviorSubject<
      readonly string[]
    >;
    const navigation$ = new BehaviorSubject<{ activeNodes: ChromeProjectNavigationNode[][] }>({
      activeNodes: [],
    });
    const breadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);

    chrome.project.getNavigation$.mockReturnValue(navigation$ as never);
    chrome.project.getBreadcrumbs$.mockReturnValue(breadcrumbs$);
    docTitleParts$.next(['Elastic']);

    const renderAnnouncer = () =>
      render(
        <TestChromeProviders chrome={chrome} deps={deps}>
          <ChromeHeaderPageAnnouncer />
        </TestChromeProviders>
      );

    const getAnnouncements = () =>
      deps.notifications.screenReader.notify.mock.calls.map(([message]) => message);

    return {
      chrome,
      deps,
      currentLocation$,
      docTitleParts$,
      navigation$,
      breadcrumbs$,
      renderAnnouncer,
      getAnnouncements,
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lets an inline title win over registered, document, and navigation titles', () => {
    const { chrome, docTitleParts$, navigation$, renderAnnouncer, getAnnouncements } =
      createHarness();
    chrome.appHeader.set({ title: 'Registered' });
    chrome.inlineAppHeader.register('Inline');
    docTitleParts$.next(['Document title', 'Elastic']);
    navigation$.next({
      activeNodes: [[createNavNode('root', 'Observability')]],
    });

    renderAnnouncer();
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Inline - Elastic']);
  });

  it('appends the default brand, and custom branding when set', () => {
    const { chrome, deps, renderAnnouncer, getAnnouncements } = createHarness();
    chrome.inlineAppHeader.register('SLOs');

    renderAnnouncer();
    flushAnnouncement();
    expect(getAnnouncements()).toEqual(['SLOs - Elastic']);

    act(() => {
      deps.customBranding.customBranding$.next({ pageTitle: 'Kibana' });
    });
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['SLOs - Elastic', 'SLOs - Kibana']);
  });

  it('does not announce the brand when no page title is resolved', () => {
    const { renderAnnouncer, getAnnouncements } = createHarness();
    renderAnnouncer();
    flushAnnouncement();

    expect(getAnnouncements()).toEqual([]);
  });

  it('does not announce a registered or fallback title while updating an inline title', () => {
    const { chrome, docTitleParts$, renderAnnouncer, getAnnouncements } = createHarness();
    chrome.appHeader.set({ title: 'Registered' });
    const inline = chrome.inlineAppHeader.register('First');
    docTitleParts$.next(['Document title', 'Elastic']);

    renderAnnouncer();
    flushAnnouncement();
    act(() => {
      inline.update('Second');
    });
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['First - Elastic', 'Second - Elastic']);
  });

  it('uses editable inline title text, then placeholder', () => {
    const { chrome, renderAnnouncer, getAnnouncements } = createHarness();
    const inline = chrome.inlineAppHeader.register({
      text: 'Named dashboard',
      placeholder: 'Untitled dashboard',
      onSave: jest.fn(),
    });

    renderAnnouncer();
    flushAnnouncement();
    act(() => {
      inline.update({ text: '  ', placeholder: 'Untitled dashboard', onSave: jest.fn() });
    });
    flushAnnouncement();

    expect(getAnnouncements()).toEqual([
      'Named dashboard - Elastic',
      'Untitled dashboard - Elastic',
    ]);
  });

  it('suppresses a registered title while an inline loading header is mounted', () => {
    const { chrome, docTitleParts$, renderAnnouncer, getAnnouncements } = createHarness();
    chrome.appHeader.set({ title: 'Registered' });
    chrome.inlineAppHeader.register();
    docTitleParts$.next(['Document page', 'Elastic']);

    renderAnnouncer();
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Document page - Elastic']);
  });

  it('lets a registered title win when no inline header is mounted', () => {
    const { chrome, docTitleParts$, navigation$, renderAnnouncer, getAnnouncements } =
      createHarness();
    chrome.appHeader.set({ title: 'Registered' });
    docTitleParts$.next(['Document title', 'Elastic']);
    navigation$.next({
      activeNodes: [[createNavNode('root', 'Observability')]],
    });

    renderAnnouncer();
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Registered - Elastic']);
  });

  it('lets a descriptive document title win over the navigation title', () => {
    const { docTitleParts$, navigation$, renderAnnouncer, getAnnouncements } = createHarness();
    docTitleParts$.next(['Saved object', 'Elastic']);
    navigation$.next({
      activeNodes: [[createNavNode('root', 'Observability')]],
    });

    renderAnnouncer();
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Saved object - Elastic']);
  });

  it('falls through a brand-only document title to the deepest navigation title', () => {
    const { navigation$, renderAnnouncer, getAnnouncements } = createHarness();
    navigation$.next({
      activeNodes: [
        [
          createNavNode('root', 'Observability'),
          createNavNode('leaf', 'Workflows', { breadcrumbStatus: 'hidden' }),
        ],
      ],
    });

    renderAnnouncer();
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Workflows - Elastic']);
  });

  it('does not announce project breadcrumbs', () => {
    const { chrome, breadcrumbs$, renderAnnouncer, getAnnouncements } = createHarness();
    chrome.inlineAppHeader.register('Dashboards');

    renderAnnouncer();
    flushAnnouncement();
    act(() => {
      breadcrumbs$.next([{ text: 'Hidden trail' }, { text: 'Should not appear' }]);
      chrome.project.setBreadcrumbs([{ text: 'Override' }]);
    });
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Dashboards - Elastic']);
  });

  // Apps that keep state in the URL hash change the location without navigating to a new page
  it('does not re-announce the same title when only the location changes', () => {
    const { chrome, currentLocation$, renderAnnouncer, getAnnouncements } = createHarness();
    chrome.inlineAppHeader.register('Dashboards');

    renderAnnouncer();
    flushAnnouncement();
    act(() => {
      currentLocation$.next('/b');
    });
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Dashboards - Elastic']);
  });

  it('cancels a scheduled fallback when a destination title arrives first', () => {
    const { chrome, currentLocation$, navigation$, renderAnnouncer, getAnnouncements } =
      createHarness();
    navigation$.next({
      activeNodes: [[createNavNode('root', 'Workflows')]],
    });

    renderAnnouncer();
    flushAnnouncement();
    act(() => {
      currentLocation$.next('/details');
    });
    act(() => {
      chrome.inlineAppHeader.register('Details');
    });
    flushAnnouncement();

    expect(getAnnouncements()).toEqual(['Workflows - Elastic', 'Details - Elastic']);
  });

  it('arms the skip link on a location change', () => {
    const { currentLocation$, renderAnnouncer } = createHarness();
    const { getByTestId } = renderAnnouncer();
    const skipLink = getByTestId('skipToMainButton');
    skipLink.focus = jest.fn();

    act(() => {
      currentLocation$.next('/b');
    });
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).toHaveBeenCalledTimes(1);
  });

  it('does not arm the skip link on a title-only change', () => {
    const { chrome, renderAnnouncer } = createHarness();
    const inline = chrome.inlineAppHeader.register('First');
    const { getByTestId } = renderAnnouncer();
    const skipLink = getByTestId('skipToMainButton');
    skipLink.focus = jest.fn();

    fireEvent.mouseDown(window);
    skipLink.focus = jest.fn();

    act(() => {
      inline.update('Second');
    });
    flushAnnouncement();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).not.toHaveBeenCalled();
  });
});
