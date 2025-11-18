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

import { NoDataCard } from './no_data_card.component';

describe('NoDataCardComponent', () => {
  test('renders with defaults', () => {
    render(<NoDataCard canAccessFleet={true} />);

    expect(screen.getByTestId('noDataCard')).toBeInTheDocument();
    expect(screen.getByText('Add Data to get started')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Browse integration options to find the best way to add your data and start analyzing.'
      )
    ).toBeInTheDocument();
  });

  test('renders no permission content when canAccessFleet is false', () => {
    render(<NoDataCard canAccessFleet={false} />);

    expect(screen.getByTestId('noDataCard')).toBeInTheDocument();
    expect(screen.getByText('Contact your administrator')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This integration is not yet enabled. Your administrator has the required permissions to turn it on.'
      )
    ).toBeInTheDocument();
  });

  describe('props', () => {
    test('renders button with href', () => {
      render(<NoDataCard href="/some-path" buttonText="Browse integrations" />);

      const button = screen.getByRole('link', { name: 'Browse integrations' });
      expect(button).toHaveAttribute('href', '/some-path');
    });

    test('renders disabled button with tooltip when disabledButtonTooltipText is provided', () => {
      const tooltipText = 'This feature is currently unavailable';
      render(
        <NoDataCard
          buttonText="Browse integrations"
          disabledButtonTooltipText={tooltipText}
          href="/app/integrations/browse"
        />
      );

      // Button should be present and disabled, not hidden
      const button = screen.getByRole('button', { name: 'Browse integrations' });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();

      // Button should not be a link when disabled
      expect(screen.queryByRole('link', { name: 'Browse integrations' })).not.toBeInTheDocument();
    });

    test('does not render button when canAccessFleet is false and disabledButtonTooltipText is not provided', () => {
      render(<NoDataCard buttonText="Setup Button" href="/setup" canAccessFleet={false} />);

      expect(screen.queryByRole('button', { name: 'Setup Button' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Setup Button' })).not.toBeInTheDocument();
    });

    test('uses custom data-test-subj when provided', () => {
      const customTestSubj = 'customNoDataCard';

      render(<NoDataCard data-test-subj={customTestSubj} />);

      expect(screen.getByTestId(customTestSubj)).toBeInTheDocument();
      expect(screen.queryByTestId('noDataCard')).not.toBeInTheDocument();
    });
  });
});
