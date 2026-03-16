/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { HeaderPageAnnouncer } from './header_page_announcer';

const createBranding$ = (branding: any = {}) => new BehaviorSubject(branding);

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
      <HeaderPageAnnouncer
        breadcrumbs={[{ text: 'Home' }]}
        customBranding$={createBranding$({})}
      />
    );
    const announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toBe('Home - Elastic');
  });

  it('renders with custom branding', async () => {
    const { findByLabelText } = render(
      <HeaderPageAnnouncer
        breadcrumbs={[{ text: 'Dashboard' }]}
        customBranding$={createBranding$({ pageTitle: 'Kibana' })}
      />
    );
    const announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toBe('Dashboard - Kibana');
  });

  it('updates route title when breadcrumbs change', async () => {
    const { findByLabelText, rerender } = render(
      <HeaderPageAnnouncer
        breadcrumbs={[{ text: 'A' }]}
        customBranding$={createBranding$({ pageTitle: 'Brand' })}
      />
    );
    let announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toContain('A');

    rerender(
      <HeaderPageAnnouncer
        breadcrumbs={[{ text: 'B' }]}
        customBranding$={createBranding$({ pageTitle: 'Brand' })}
      />
    );

    announcer = await findByLabelText('Page change announcements');

    expect(announcer.textContent).toBe('B - Brand');
  });

  it('renders skip link', () => {
    const { getByText } = render(
      <HeaderPageAnnouncer
        breadcrumbs={[{ text: 'Test' }]}
        customBranding$={createBranding$({})}
      />
    );
    expect(getByText('Skip to main content')).toBeInTheDocument();
  });

  it('focuses skip link on TAB when shouldHandlingTab is true', () => {
    const { getByTestId } = render(
      <HeaderPageAnnouncer
        breadcrumbs={[{ text: 'Test' }]}
        customBranding$={createBranding$({})}
      />
    );
    const skipLink = getByTestId('skipToMainButton');
    skipLink.focus = jest.fn();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).toHaveBeenCalledTimes(1);
  });

  it('does not focus skip link when Tab is pressed and focus is already within main content', () => {
    const { getByTestId, getByText } = render(
      <>
        <HeaderPageAnnouncer
          breadcrumbs={[{ text: 'Test' }]}
          customBranding$={createBranding$({})}
        />
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
        <HeaderPageAnnouncer
          breadcrumbs={[{ text: 'Test' }]}
          customBranding$={createBranding$({})}
        />
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
