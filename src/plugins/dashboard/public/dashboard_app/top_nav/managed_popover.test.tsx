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

describe('ManagedPopover', () => {
  xit('should render', async () => {
    const mockDashboard = buildMockDashboard();
    await render(<ManagedPopover dashboard={mockDashboard} redirectTo={jest.fn()} />);
    const [managedButton] = await screen.findAllByText('Managed');
    expect(managedButton).toBeInTheDocument();
  });
  xit('opens the popover with duplicate button', async () => {
    const mockDashboard = buildMockDashboard();
    await render(<ManagedPopover dashboard={mockDashboard} redirectTo={jest.fn()} />);
    const [managedButton] = await screen.findAllByText('Managed');
    await managedButton.click();
    const duplicateButton = await screen.findByRole('button', { name: 'Duplicate this dashboard' });
    expect(duplicateButton).toBeInTheDocument();
  });
  it('duplicates the dashboard', async () => {
    const mockDashboard = buildMockDashboard();
    mockDashboard.dispatch.setTitle('Test');
    const mockFn = jest.fn();
    await render(<ManagedPopover dashboard={mockDashboard} redirectTo={mockFn} />);
    const [managedButton] = await screen.findAllByText('Managed');
    await userEvent.click(managedButton);
    const duplicateButton = await screen.findByRole('button', { name: 'Duplicate this dashboard' });
    expect(duplicateButton).toBeInTheDocument();
    await userEvent.click(duplicateButton);
    // need to figure out how to test the redirect - the mock function is not being called
  });
});
