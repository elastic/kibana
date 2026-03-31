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
import '@kbn/code-editor-mock/jest_helper';
import type { DashboardState } from '../../server';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';
import { ExportJsonPanel } from './export_json_panel';
import { sanitizeDashboard } from './sanitize_dashboard';
import { userEvent } from '@testing-library/user-event';

jest.mock('./sanitize_dashboard', () => ({
  sanitizeDashboard: jest.fn(),
}));

describe('ExportJsonPanel', () => {
  const dashboardState: DashboardState = {
    title: 'my dashboard',
    panels: [],
    pinned_panels: [],
    options: DEFAULT_DASHBOARD_OPTIONS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator then renders sanitized JSON', async () => {
    (sanitizeDashboard as jest.Mock).mockResolvedValue({
      data: { ...dashboardState, title: 'my dashboard (sanitized)' },
      warnings: [],
    });

    render(<ExportJsonPanel dashboardState={dashboardState} />);

    expect(screen.getByTestId('dashboardExportSourceLoading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('dashboardExportSourceLoading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
  });

  it('renders warnings when the server reports unsupported panels', async () => {
    const user = userEvent.setup();
    (sanitizeDashboard as jest.Mock).mockResolvedValue({
      data: dashboardState,
      warnings: [
        { message: 'Dropped panel panel1, panel schema not available for panel type: foo.' },
      ],
    });

    render(<ExportJsonPanel dashboardState={dashboardState} />);

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

  it('renders an error callout when sanitization fails and hides sanitized JSON', async () => {
    (sanitizeDashboard as jest.Mock).mockRejectedValue(new Error('boom'));

    render(<ExportJsonPanel dashboardState={dashboardState} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboardExportSourceSanitizeErrorPrompt')).toBeInTheDocument();
    });

    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.queryByTestId('exportAssetValue')).not.toBeInTheDocument();

    expect(screen.queryByTestId('exportAssetValue')).not.toBeInTheDocument();
  });

  it('retries sanitization when the user clicks Retry', async () => {
    const user = userEvent.setup();
    (sanitizeDashboard as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        data: { ...dashboardState, title: 'my dashboard (sanitized)' },
        warnings: [],
      });

    render(<ExportJsonPanel dashboardState={dashboardState} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboardExportSourceSanitizeErrorPrompt')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dashboardExportSourceRetryButton'));
    await waitFor(() => {
      expect(sanitizeDashboard).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
    });
  });
});
