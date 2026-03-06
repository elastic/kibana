/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { ChromeComponentsProvider } from '../context';
import { createMockChromeComponentsDeps } from '../test_helpers';
import { ProjectHeader } from './header';

describe('Header', () => {
  it('renders', async () => {
    const deps = createMockChromeComponentsDeps();
    render(
      <ChromeComponentsProvider value={deps}>
        <ProjectHeader />
      </ChromeComponentsProvider>
    );

    expect(screen.queryByTestId(/nav-header-logo/)).toBeVisible();
  });

  it('renders custom branding logo', async () => {
    const deps = createMockChromeComponentsDeps();
    const { queryByTestId } = render(
      <ChromeComponentsProvider value={deps}>
        <ProjectHeader />
      </ChromeComponentsProvider>
    );

    act(() => {
      deps.customBranding$.next({ logo: 'foo.jpg' });
    });

    expect(queryByTestId(/customLogo/)).not.toBeNull();
  });
});
