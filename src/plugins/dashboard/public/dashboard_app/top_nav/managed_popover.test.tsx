/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ManagedPopover } from './managed_popover';
import { buildMockDashboard } from '../../mocks';
import userEvent from '@testing-library/user-event';
import { pluginServices } from '../../services/plugin_services';

describe('ManagedPopover', () => {
  it('should render', async () => {
    const mockDashboard = buildMockDashboard();
    await render(<ManagedPopover dashboard={mockDashboard} redirectTo={jest.fn()} />);
    const [managedButton] = await screen.findAllByText('Managed');
    expect(managedButton).toBeInTheDocument();
  });

  it('opens the popover with duplicate button', async () => {
    const mockDashboard = buildMockDashboard();
    const duplicateSpy = jest.spyOn(mockDashboard, 'duplicate');
    const redirectTo = jest.fn();
    pluginServices.getServices().dashboardContentManagement.checkForDuplicateDashboardTitle = jest
      .fn()
      .mockReturnValue(true);
    pluginServices.getServices().dashboardContentManagement.saveDashboardState = jest
      .fn()
      .mockReturnValue({ references: [], id: 'title' });
    await render(<ManagedPopover dashboard={mockDashboard} redirectTo={redirectTo} />);
    const [managedButton] = await screen.findAllByText('Managed');
    await managedButton.click();
    const duplicateButton = await screen.findByRole('button', { name: 'Duplicate this dashboard' });
    expect(duplicateButton).toBeInTheDocument();
    userEvent.click(duplicateButton);
    expect(duplicateSpy).toHaveBeenCalled();
  });
});
