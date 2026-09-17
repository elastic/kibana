/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardEnhanceButton } from './dashboard_enhance_button';

let mockApplicationBreakpoint: string | undefined = 'xl';

jest.mock('@kbn/core-chrome-layout-utils', () => ({
  useCurrentChromeApplicationBreakpoint: () => mockApplicationBreakpoint,
}));

const renderButton = (onClick = jest.fn()) => {
  render(
    <EuiThemeProvider>
      <DashboardEnhanceButton action={{ onClick }} />
    </EuiThemeProvider>
  );
  return onClick;
};

describe('DashboardEnhanceButton', () => {
  beforeEach(() => {
    mockApplicationBreakpoint = 'xl';
  });

  it('renders a labeled Enhance control and calls onClick with returnFocus', () => {
    const onClick = renderButton();

    const button = screen.getByRole('button', { name: 'Enhance' });
    expect(button).toHaveTextContent('Enhance');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(typeof onClick.mock.calls[0][0].returnFocus).toBe('function');
  });

  it('renders icon-only at the s application breakpoint', () => {
    mockApplicationBreakpoint = 's';
    renderButton();

    const button = screen.getByRole('button', { name: 'Enhance' });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveTextContent('Enhance');
  });
});
