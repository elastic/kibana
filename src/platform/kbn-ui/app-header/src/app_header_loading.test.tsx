/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { APP_MENU_TEST_SUBJECTS } from '@kbn/ui-app-menu';
import { AppHeaderLoadingView } from './app_header_loading';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

jest.mock('@kbn/ui-chrome-layout', () => ({
  useCurrentChromeApplicationBreakpoint: () => 'xl',
}));

describe('AppHeaderLoadingView', () => {
  it('skeletons the title and the default overflow + primary menu', () => {
    render(<AppHeaderLoadingView />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.skeleton)).toBeInTheDocument();
    expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.loading)).toBeInTheDocument();
    expect(
      screen.getByTestId(APP_MENU_TEST_SUBJECTS.loading).querySelectorAll('.euiSkeletonRectangle')
    ).toHaveLength(2);
  });

  it('keeps the back button next to the title skeleton', () => {
    render(<AppHeaderLoadingView back={{ href: '/app/my-app', label: 'My app' }} />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/my-app'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.skeleton)).toBeInTheDocument();
  });

  it('customizes the menu skeleton', () => {
    render(<AppHeaderLoadingView menu={{ buttonCount: 2, hasPrimary: false }} />);

    expect(
      screen.getByTestId(APP_MENU_TEST_SUBJECTS.loading).querySelectorAll('.euiSkeletonRectangle')
    ).toHaveLength(2);
  });

  it('omits the menu when nothing is requested', () => {
    render(<AppHeaderLoadingView menu={{ buttonCount: 0, hasPrimary: false }} />);

    expect(screen.queryByTestId(APP_MENU_TEST_SUBJECTS.loading)).not.toBeInTheDocument();
  });
});
