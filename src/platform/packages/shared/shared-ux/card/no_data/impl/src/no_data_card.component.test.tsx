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
  test('renders with default content when hasPermission is true', () => {
    render(<NoDataCard hasPermission={true} />);

    expect(screen.getByTestId('noDataCard')).toBeInTheDocument();
    expect(screen.getByText('Add Data to get started')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Browse integration options to find the best way to add your data and start analyzing.'
      )
    ).toBeInTheDocument();
  });

  test('renders no permission content when hasPermission is false', () => {
    render(<NoDataCard hasPermission={false} />);

    expect(screen.getByTestId('noDataCard')).toBeInTheDocument();
    expect(screen.getByText('Contact your administrator')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This integration is not yet enabled. Your administrator has the required permissions to turn it on.'
      )
    ).toBeInTheDocument();
  });

  describe('props', () => {
    test('renders custom button text', () => {
      render(<NoDataCard button="Custom Button" hasPermission={true} href="/test" />);

      expect(screen.getByRole('link', { name: 'Custom Button' })).toBeInTheDocument();
    });

    test('renders button with href', () => {
      render(<NoDataCard hasPermission={true} href="/some-path" button="Browse integrations" />);

      const button = screen.getByRole('link', { name: 'Browse integrations' });
      expect(button).toHaveAttribute('href', '/some-path');
    });

    test('renders custom title and description', () => {
      render(
        <NoDataCard title="Custom Title" description="Custom description" hasPermission={true} />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    test('does not render button if no hideActions is passed and without href', () => {
      render(<NoDataCard hasPermission={true} hideActions={true} />);

      expect(screen.queryByTestId('noDataDefaultActionButton')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Should not show/i })).not.toBeInTheDocument();
    });

    test('renders custom data-test-subj', () => {
      render(<NoDataCard hasPermission={true} data-test-subj="customTestSubj" />);

      expect(screen.getByTestId('customTestSubj')).toBeInTheDocument();
    });
  });
});
