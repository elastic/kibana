/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { DashboardState } from '../../server';
import { ExportSourceAssetPanel } from './export_source_asset_panel';
import { getSanitizedExportSource } from './dashboard_export_source_client';
import { userEvent } from '@testing-library/user-event';

jest.mock('./dashboard_export_source_client', () => ({
  getSanitizedExportSource: jest.fn(),
}));

describe('ExportSourceAssetPanel', () => {
  const dashboardState: DashboardState = {
    title: 'my dashboard',
    panels: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator then renders sanitized JSON', async () => {
    (getSanitizedExportSource as jest.Mock).mockResolvedValue({
      data: { title: 'my dashboard (sanitized)', panels: [] },
      warnings: [],
    });

    render(<ExportSourceAssetPanel title="my dashboard" dashboardState={dashboardState} />);

    expect(screen.getByTestId('dashboardExportSourceLoading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('dashboardExportSourceLoading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
    expect(screen.getByText(/my dashboard \(sanitized\)/)).toBeInTheDocument();
  });

  it('renders warnings when the server reports unsupported panels', async () => {
    const user = userEvent.setup();
    (getSanitizedExportSource as jest.Mock).mockResolvedValue({
      data: { title: 'my dashboard', panels: [] },
      warnings: ['Dropped panel panel1, panel schema not available for panel type: foo.'],
    });

    render(<ExportSourceAssetPanel title="my dashboard" dashboardState={dashboardState} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboardExportSourceWarnings')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('dashboardExportSourceWarningsList')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show details/i }));
    expect(screen.getByTestId('dashboardExportSourceWarningsList')).toBeInTheDocument();
    expect(screen.getByText(/Dropped panel panel1/)).toBeInTheDocument();

    const callout = screen.getByTestId('dashboardExportSourceWarnings');
    await user.click(within(callout).getByTestId('euiDismissCalloutButton'));
    expect(screen.queryByTestId('dashboardExportSourceWarnings')).not.toBeInTheDocument();
    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
  });

  it('collapses large warning lists by default and allows expanding', async () => {
    const user = userEvent.setup();
    const warnings = Array.from({ length: 6 }, (_, i) => `Dropped panel panel${i + 1}`);

    (getSanitizedExportSource as jest.Mock).mockResolvedValue({
      data: { title: 'my dashboard', panels: [] },
      warnings,
    });

    render(<ExportSourceAssetPanel title="my dashboard" dashboardState={dashboardState} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboardExportSourceWarnings')).toBeInTheDocument();
    });

    // Collapsed: list content shouldn't be in the DOM yet
    expect(screen.queryByTestId('dashboardExportSourceWarningsList')).not.toBeInTheDocument();
    expect(screen.queryByText('Dropped panel panel1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Show details/i }));

    expect(screen.getByTestId('dashboardExportSourceWarningsList')).toBeInTheDocument();
    expect(screen.getByText('Dropped panel panel1')).toBeInTheDocument();
  });

  it('renders an error callout when sanitization fails and still shows JSON', async () => {
    const user = userEvent.setup();
    (getSanitizedExportSource as jest.Mock).mockRejectedValue(new Error('boom'));

    render(<ExportSourceAssetPanel title="my dashboard" dashboardState={dashboardState} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboardExportSourceSanitizeError')).toBeInTheDocument();
    });

    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
    expect(screen.getByText(/\"title\": \"my dashboard\"/)).toBeInTheDocument();

    const callout = screen.getByTestId('dashboardExportSourceSanitizeError');
    await user.click(within(callout).getByTestId('euiDismissCalloutButton'));
    expect(screen.queryByTestId('dashboardExportSourceSanitizeError')).not.toBeInTheDocument();
    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
  });
});

