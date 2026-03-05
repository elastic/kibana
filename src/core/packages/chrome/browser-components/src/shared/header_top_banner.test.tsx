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
import { act, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ChromeUserBanner } from '@kbn/core-chrome-browser';
import { ChromeComponentsProvider } from '../context';
import { createMockChromeComponentsDeps } from '../test_helpers';
import { HeaderTopBanner } from './header_top_banner';

const renderBanner = (banner?: ChromeUserBanner) => {
  const deps = createMockChromeComponentsDeps();
  if (banner) deps.headerBanner$.next(banner);
  const result = render(
    <EuiProvider>
      <ChromeComponentsProvider value={deps}>
        <HeaderTopBanner />
      </ChromeComponentsProvider>
    </EuiProvider>
  );
  return { ...result, deps };
};

describe('HeaderTopBanner', () => {
  it('renders nothing when no banner is set', () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a ReactNode-based banner content', () => {
    renderBanner({
      content: <span data-test-subj="banner-content">Maintenance window active</span>,
    });
    expect(screen.getByTestId('banner-content')).toHaveTextContent('Maintenance window active');
  });

  it('hides the banner when the observable emits undefined', () => {
    const { deps } = renderBanner({
      content: <span data-test-subj="banner-content">Active</span>,
    });
    expect(screen.getByTestId('banner-content')).toBeInTheDocument();

    act(() => {
      deps.headerBanner$.next(undefined);
    });

    expect(screen.queryByTestId('banner-content')).not.toBeInTheDocument();
  });
});
