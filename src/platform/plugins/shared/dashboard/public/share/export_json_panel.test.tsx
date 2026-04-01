/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@kbn/code-editor-mock/jest_helper';
import type { DashboardState } from '../../server';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';
import { ExportJsonPanel } from './export_json_panel';
import { userEvent } from '@testing-library/user-event';
import type { ExportJsonSanitizedState } from './types';

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

  it('shows a loading indicator while loading', async () => {
    const sanitizedState: ExportJsonSanitizedState = {
      status: 'loading',
      data: undefined,
      warnings: [],
      error: undefined,
    };
    render(<ExportJsonPanel {...sanitizedState} onRetry={jest.fn()} />);
    expect(screen.getByTestId('dashboardExportSourceLoading')).toBeInTheDocument();
  });

  it('renders warnings when the server reports unsupported panels', async () => {
    const user = userEvent.setup();
    const sanitizedState: ExportJsonSanitizedState = {
      status: 'success',
      data: dashboardState,
      warnings: ['Dropped panel panel1, panel schema not available for panel type: foo.'],
      error: undefined,
    };

    render(<ExportJsonPanel {...sanitizedState} onRetry={jest.fn()} />);

    expect(screen.getByTestId('dashboardExportSourceWarnings')).toBeInTheDocument();

    expect(screen.queryByTestId('dashboardExportSourceWarningsList')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show details/i }));
    expect(screen.getByTestId('dashboardExportSourceWarningsList')).toBeInTheDocument();
    expect(screen.getByText(/Dropped panel panel1/)).toBeInTheDocument();

    const callout = screen.getByTestId('dashboardExportSourceWarnings');
    await user.click(within(callout).getByTestId('euiDismissCalloutButton'));
    expect(screen.queryByTestId('dashboardExportSourceWarnings')).not.toBeInTheDocument();
    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
  });

  it('renders an error prompt and hides sanitized JSON', async () => {
    const sanitizedState: ExportJsonSanitizedState = {
      status: 'error',
      data: undefined,
      warnings: [],
      error: new Error('boom'),
    };
    render(<ExportJsonPanel {...sanitizedState} onRetry={jest.fn()} />);

    expect(screen.getByTestId('dashboardExportSourceSanitizeErrorPrompt')).toBeInTheDocument();

    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.queryByTestId('exportAssetValue')).not.toBeInTheDocument();
  });

  it('calls onRetry when the user clicks Retry', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    const sanitizedState: ExportJsonSanitizedState = {
      status: 'error',
      data: undefined,
      warnings: [],
      error: new Error('boom'),
    };

    render(<ExportJsonPanel {...sanitizedState} onRetry={onRetry} />);

    await user.click(screen.getByTestId('dashboardExportSourceRetryButton'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
