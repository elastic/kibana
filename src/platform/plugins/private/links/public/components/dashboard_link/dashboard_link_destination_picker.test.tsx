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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DashboardLinkDestinationPicker } from './dashboard_link_destination_picker';
import { fetchDashboards } from './dashboard_link_tools';

jest.mock('./dashboard_link_tools', () => {
  return {
    fetchDashboard: jest.fn(),
    fetchDashboards: jest.fn(),
  };
});

describe('Dashboard link destination picker', () => {
  const renderPicker = () => {
    return render(
      <EuiThemeProvider>
        <DashboardLinkDestinationPicker onDestinationPicked={jest.fn()} onUnmount={jest.fn()} />
      </EuiThemeProvider>
    );
  };

  beforeEach(() => {
    jest.mocked(fetchDashboards).mockResolvedValue([
      { id: '1', title: 'Dashboard 1' },
      { id: '2', title: 'Dashboard 2' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('stays in the loading state until the options for the current search have resolved', async () => {
    const { container } = renderPicker();
    await waitFor(() => {
      expect(container.querySelector('.euiLoadingSpinner')).toBeNull();
    });

    fireEvent.change(screen.getByTestId('comboBoxSearchInput'), {
      target: { value: 'Dashboard 2' },
    });

    // the debounced refetch has not started yet, but the rendered options are already stale
    expect(container.querySelector('.euiLoadingSpinner')).not.toBeNull();

    await waitFor(() => {
      expect(container.querySelector('.euiLoadingSpinner')).toBeNull();
    });
    expect(fetchDashboards).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Dashboard 2' })
    );
  });

  test('leaves the loading state when the dashboard list cannot be fetched', async () => {
    jest.mocked(fetchDashboards).mockRejectedValue(new Error('failed to fetch dashboards'));
    const { container } = renderPicker();

    await waitFor(() => {
      expect(container.querySelector('.euiLoadingSpinner')).toBeNull();
    });
  });
});
