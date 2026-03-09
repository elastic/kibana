/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { act, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';
import type { ChromeUserBanner } from '@kbn/core-chrome-browser';
import { HeaderTopBanner } from './header_top_banner';

describe('HeaderTopBanner', () => {
  it('renders nothing when no banner is set', () => {
    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>(undefined);
    const { container } = renderWithEuiTheme(<HeaderTopBanner headerBanner$={headerBanner$} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a ReactNode-based banner content', () => {
    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>({
      content: <span data-test-subj="banner-content">Maintenance window active</span>,
    });
    renderWithEuiTheme(<HeaderTopBanner headerBanner$={headerBanner$} />);
    expect(screen.getByTestId('banner-content')).toHaveTextContent('Maintenance window active');
  });

  it('renders a MountPoint-based banner content', () => {
    const mount = (el: HTMLDivElement) => {
      el.setAttribute('data-test-subj', 'mount-banner');
      return () => {};
    };
    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>({ mount });
    renderWithEuiTheme(<HeaderTopBanner headerBanner$={headerBanner$} />);
    expect(screen.getByTestId('mount-banner')).toBeInTheDocument();
  });

  it('hides the banner when the observable emits undefined', () => {
    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>({
      content: <span data-test-subj="banner-content">Active</span>,
    });
    renderWithEuiTheme(<HeaderTopBanner headerBanner$={headerBanner$} />);
    expect(screen.getByTestId('banner-content')).toBeInTheDocument();

    act(() => {
      headerBanner$.next(undefined);
    });

    expect(screen.queryByTestId('banner-content')).not.toBeInTheDocument();
  });
});
