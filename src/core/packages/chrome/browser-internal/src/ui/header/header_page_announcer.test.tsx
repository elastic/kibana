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
import { BehaviorSubject } from 'rxjs';
import { HeaderPageAnnouncer } from './header_page_announcer';

const createBreadcrumbs$ = (breadcrumbs: any[] = []) => new BehaviorSubject(breadcrumbs);
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
        breadcrumbs$={createBreadcrumbs$([{ text: 'Home' }])}
        customBranding$={createBranding$({})}
      />
    );
    const announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toBe('Home - Elastic');
  });

  it('renders with custom branding', async () => {
    const { findByLabelText } = render(
      <HeaderPageAnnouncer
        breadcrumbs$={createBreadcrumbs$([{ text: 'Dashboard' }])}
        customBranding$={createBranding$({ pageTitle: 'Kibana' })}
      />
    );
    const announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toBe('Dashboard - Kibana');
  });

  it('updates route title when breadcrumbs change', async () => {
    const breadcrumbs$ = createBreadcrumbs$([{ text: 'A' }]);
    const { findByLabelText, rerender } = render(
      <HeaderPageAnnouncer
        breadcrumbs$={breadcrumbs$}
        customBranding$={createBranding$({ pageTitle: 'Brand' })}
      />
    );
    let announcer = await findByLabelText('Page change announcements');
    expect(announcer.textContent).toContain('A');

    act(() => {
      breadcrumbs$.next([{ text: 'B' }]);
    });

    rerender(
      <HeaderPageAnnouncer
        breadcrumbs$={breadcrumbs$}
        customBranding$={createBranding$({ pageTitle: 'Brand' })}
      />
    );

    announcer = await findByLabelText('Page change announcements');

    expect(announcer.textContent).toBe('B - Brand');
  });

  it('renders skip link', () => {
    const { getByText } = render(
      <HeaderPageAnnouncer
        breadcrumbs$={createBreadcrumbs$([{ text: 'Test' }])}
        customBranding$={createBranding$({})}
      />
    );
    expect(getByText('Skip to main content')).toBeInTheDocument();
  });

  it('focuses skip link on TAB when shouldHandlingTab is true', () => {
    const { getByTestId } = render(
      <HeaderPageAnnouncer
        breadcrumbs$={createBreadcrumbs$([{ text: 'Test' }])}
        customBranding$={createBranding$({})}
      />
    );
    const skipLink = getByTestId('skipToMainButton');
    skipLink.focus = jest.fn();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(skipLink.focus).toHaveBeenCalledTimes(1);
  });
});
