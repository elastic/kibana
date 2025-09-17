/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EmptyState } from './empty_state';

describe('EmptyState', () => {
  it('renders the empty state with default props', async () => {
    render(
      <IntlProvider locale="en">
        <EmptyState />
      </IntlProvider>
    );

    expect(await screen.findByTestId('alertsTableEmptyState')).toBeInTheDocument();

    expect(screen.getByText('No results match your search criteria')).toBeInTheDocument();
    expect(
      screen.getByText('Try searching over a longer period of time or modifying your search')
    ).toBeInTheDocument();
  });

  it('renders the empty state with props', async () => {
    render(
      <IntlProvider locale="en">
        <EmptyState
          messageTitle="No Alerts"
          messageBody="There are currently no alerts to display."
        />
      </IntlProvider>
    );

    expect(await screen.findByTestId('alertsTableEmptyState')).toBeInTheDocument();
    expect(screen.getByText('There are currently no alerts to display.')).toBeInTheDocument();
  });

  it('renders the error state when an error is provided', async () => {
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState
          messageTitle="No Alerts"
          messageBody="There are currently no alerts to display."
          error={error}
        />
      </IntlProvider>
    );

    expect(await screen.findByText('Test error message')).toBeInTheDocument();
    expect(screen.queryByText('There are currently no alerts to display.')).not.toBeInTheDocument();
  });

  it('renders the reset button when onResetToPreviousState is provided', async () => {
    const mockReset = jest.fn();
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState error={error} onResetToPreviousState={mockReset} />
      </IntlProvider>
    );

    expect(await screen.findByText('Test error message')).toBeInTheDocument();
    expect(await screen.findByTestId('resetToPreviousStateButton')).toBeInTheDocument();
  });

  it('does not show reset button when it is not error', async () => {
    const mockReset = jest.fn();
    render(
      <IntlProvider locale="en">
        <EmptyState
          messageTitle="No Alerts"
          messageBody="There are currently no alerts to display."
          onResetToPreviousState={mockReset}
        />
      </IntlProvider>
    );

    expect(screen.queryByTestId('resetToPreviousStateButton')).not.toBeInTheDocument();
  });

  it('does not render the reset button when onResetToPreviousState is not provided', async () => {
    const error = new Error('Test error message');
    render(
      <IntlProvider locale="en">
        <EmptyState error={error} />
      </IntlProvider>
    );

    expect(screen.queryByTestId('resetToPreviousStateButton')).not.toBeInTheDocument();
  });
});
