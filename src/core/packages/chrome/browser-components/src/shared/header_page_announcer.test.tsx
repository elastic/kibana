/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { HeaderPageAnnouncer } from './header_page_announcer';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiLiveAnnouncer: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  };
});

describe('HeaderPageAnnouncer', () => {
  it('renders with default brand when no branding is provided', async () => {
    const { findByLabelText } = render(
      <TestChromeProviders>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'Home' }]} />
      </TestChromeProviders>
    );
    const announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toBe('Home - Elastic');
  });

  it('renders with custom branding', async () => {
    const deps = createMockChromeComponentsDeps();
    act(() => {
      deps.customBranding.customBranding$.next({ pageTitle: 'Kibana' });
    });

    const { findByLabelText } = render(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'Dashboard' }]} />
      </TestChromeProviders>
    );
    const announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toBe('Dashboard - Kibana');
  });

  it('updates route title when breadcrumbs change', async () => {
    const deps = createMockChromeComponentsDeps();
    act(() => {
      deps.customBranding.customBranding$.next({ pageTitle: 'Brand' });
    });

    const { findByLabelText, rerender } = render(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'A' }]} />
      </TestChromeProviders>
    );
    let announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toContain('A');

    rerender(
      <TestChromeProviders deps={deps}>
        <HeaderPageAnnouncer breadcrumbs={[{ text: 'B' }]} />
      </TestChromeProviders>
    );

    announcer = await findByLabelText('Page change announcements');

    expect(announcer.textContent).toBe('B - Brand');
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
});
