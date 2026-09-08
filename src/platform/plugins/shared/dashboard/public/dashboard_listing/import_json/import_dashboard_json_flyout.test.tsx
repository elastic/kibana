/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { ImportDashboardJsonFlyout } from './import_dashboard_json_flyout';

const mockSanitizeDashboard = jest.fn();
jest.mock(
  '../../dashboard_app/top_nav/share/export_json/sanitize_dashboard',
  () => ({ sanitizeDashboard: (...args: unknown[]) => mockSanitizeDashboard(...args) })
);

const mockDashboardClientCreate = jest.fn();
jest.mock('../../dashboard_client/dashboard_client', () => ({
  dashboardClient: {
    create: (...args: unknown[]) => mockDashboardClientCreate(...args),
  },
}));

const mockAddDanger = jest.fn();
jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    notifications: { toasts: { addDanger: (...args: unknown[]) => mockAddDanger(...args) } },
    application: {
      getUrlForApp: () => '/app/management/kibana/objects',
    },
  },
}));

const VALID_STATE = { title: 'My Dashboard', panels: [], description: '' };
const VALID_FILE = new File([JSON.stringify(VALID_STATE)], 'dashboard.json', {
  type: 'application/json',
});

const renderFlyout = (onImportSuccess = jest.fn(), closeFlyout = jest.fn()) =>
  render(
    <I18nProvider>
      <ImportDashboardJsonFlyout closeFlyout={closeFlyout} onImportSuccess={onImportSuccess} />
    </I18nProvider>
  );

const pickFile = async (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    await userEvent.upload(input, file);
  });
};

describe('ImportDashboardJsonFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSanitizeDashboard.mockResolvedValue({ data: VALID_STATE, warnings: [] });
    mockDashboardClientCreate.mockResolvedValue({ id: 'new-id', data: VALID_STATE });
  });

  it('renders the file picker and NDJSON note', () => {
    renderFlyout();
    expect(screen.getByTestId('importDashboardJsonFilePicker')).toBeInTheDocument();
    expect(screen.getByText(/Stack Management/)).toBeInTheDocument();
  });

  it('shows an error when an invalid JSON file is selected', async () => {
    renderFlyout();
    const badFile = new File(['not json }{'], 'bad.json', { type: 'application/json' });
    await pickFile(badFile);
    await waitFor(() =>
      expect(screen.getByText(/does not contain valid JSON/)).toBeInTheDocument()
    );
  });

  it('shows an error when the public API response shape { id, data, meta } is provided', async () => {
    renderFlyout();
    const apiResponseFile = new File(
      [JSON.stringify({ id: 'abc', data: VALID_STATE, meta: {} })],
      'api.json',
      { type: 'application/json' }
    );
    await pickFile(apiResponseFile);
    await waitFor(() =>
      expect(screen.getByText(/does not appear to be a valid dashboard/)).toBeInTheDocument()
    );
  });

  it('shows an error when a JSON file with an unrecognised format is selected', async () => {
    renderFlyout();
    const badFile = new File([JSON.stringify({ foo: 'bar' })], 'bad.json', {
      type: 'application/json',
    });
    await pickFile(badFile);
    await waitFor(() =>
      expect(screen.getByText(/does not appear to be a valid dashboard/)).toBeInTheDocument()
    );
  });

  it('calls sanitize and enables Import after a valid file is chosen', async () => {
    renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() => expect(mockSanitizeDashboard).toHaveBeenCalledWith(VALID_STATE));
    expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled();
  });

  it('displays sanitize warnings', async () => {
    mockSanitizeDashboard.mockResolvedValue({
      data: VALID_STATE,
      warnings: ['Panel "chart-1" could not be loaded'],
    });
    renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonWarnings')).toBeInTheDocument()
    );
    expect(screen.getByText(/Panel "chart-1" could not be loaded/)).toBeInTheDocument();
  });

  it('creates a new dashboard and calls onImportSuccess', async () => {
    const onImportSuccess = jest.fn();
    const closeFlyout = jest.fn();
    renderFlyout(onImportSuccess, closeFlyout);
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled()
    );
    await act(async () => {
      await userEvent.click(screen.getByTestId('importDashboardJsonImportButton'));
    });
    await waitFor(() => expect(mockDashboardClientCreate).toHaveBeenCalledWith(VALID_STATE));
    expect(onImportSuccess).toHaveBeenCalledWith('new-id', 'My Dashboard');
    expect(closeFlyout).toHaveBeenCalled();
  });
});
