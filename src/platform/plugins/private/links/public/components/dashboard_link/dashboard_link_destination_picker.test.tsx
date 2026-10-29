/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DashboardLinkDestinationPicker } from './dashboard_link_destination_picker';
import { fetchDashboards } from './dashboard_link_tools';

jest.mock('./dashboard_link_tools', () => ({
  fetchDashboard: jest.fn(),
  fetchDashboards: jest.fn(),
}));

const fetchDashboardsMock = fetchDashboards as jest.MockedFunction<typeof fetchDashboards>;

describe('DashboardLinkDestinationPicker', () => {
  beforeEach(() => {
    fetchDashboardsMock.mockResolvedValue([{ id: 'dashboard-a', title: 'Dashboard A' }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const expectNotLoading = async () =>
    await waitFor(() => expect(screen.queryAllByRole('progressbar')).toHaveLength(0));

  test('replaces the stale options with a loading state until the typed search is fetched', async () => {
    render(
      <DashboardLinkDestinationPicker
        onDestinationPicked={jest.fn()}
        onUnmount={jest.fn()}
        parentDashboardId="parent"
      />
    );
    await expectNotLoading();

    fireEvent.change(screen.getByTestId('comboBoxSearchInput'), {
      target: { value: 'Dashboard A' },
    });

    // the search is debounced, so the already rendered options are stale as soon as the user types
    expect(screen.getByText('Loading options')).toBeInTheDocument();
    expect(screen.queryByRole('option')).toBeNull();

    await waitFor(() =>
      expect(fetchDashboardsMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Dashboard A' })
      )
    );
    await expectNotLoading();
    expect(screen.getByRole('option', { name: /Dashboard A/ })).toBeInTheDocument();
  });
});
