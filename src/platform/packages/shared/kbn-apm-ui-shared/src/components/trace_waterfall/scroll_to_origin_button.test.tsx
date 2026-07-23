/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ScrollToOriginButton } from './scroll_to_origin_button';

const renderButton = (props: React.ComponentProps<typeof ScrollToOriginButton>) =>
  render(
    <EuiThemeProvider>
      <ScrollToOriginButton {...props} />
    </EuiThemeProvider>
  );

describe('ScrollToOriginButton', () => {
  it('renders the button', () => {
    renderButton({ isDisabled: false, onClick: () => {} });

    expect(screen.getByTestId('waterfallScrollToOriginButton')).toBeInTheDocument();
  });

  it('renders the label', () => {
    renderButton({ isDisabled: false, onClick: () => {} });

    expect(screen.getByText('Scroll to origin')).toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', () => {
    const onClick = jest.fn();
    renderButton({ isDisabled: false, onClick });

    fireEvent.click(screen.getByTestId('waterfallScrollToOriginButton'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when isDisabled is true', () => {
    renderButton({ isDisabled: true, onClick: () => {} });

    expect(screen.getByTestId('waterfallScrollToOriginButton')).toBeDisabled();
  });
});
