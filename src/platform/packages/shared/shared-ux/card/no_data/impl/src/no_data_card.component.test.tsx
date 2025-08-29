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
import '@testing-library/jest-dom';

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
      render(<NoDataCard href="/some-path" button="Browse integrations" />);

      const button = screen.getByRole('link', { name: 'Browse integrations' });
      expect(button).toHaveAttribute('href', '/some-path');
    });

    test('renders custom title and description', () => {
      render(<NoDataCard title="Custom Title" description="Custom description" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    test('does not render button if hideButton is passed and/or without href', () => {
      render(<NoDataCard hideActionButton={true} />);

      expect(screen.queryByTestId('noDataDefaultActionButton')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Should not show/i })).not.toBeInTheDocument();
    });
  });
});
