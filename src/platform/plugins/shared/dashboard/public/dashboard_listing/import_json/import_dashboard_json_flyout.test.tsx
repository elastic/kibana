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
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';

import { ImportDashboardJsonFlyout } from './import_dashboard_json_flyout';

const mockSanitizeDashboard = jest.fn();
jest.mock(
  '../../dashboard_app/top_nav/share/export_json/sanitize_dashboard',
  () => ({ sanitizeDashboard: (...args: unknown[]) => mockSanitizeDashboard(...args) })
);

const mockDashboardClientGet = jest.fn();
const mockDashboardClientCreate = jest.fn();
const mockDashboardClientUpdate = jest.fn();
jest.mock('../../dashboard_client/dashboard_client', () => ({
  dashboardClient: {
    get: (...args: unknown[]) => mockDashboardClientGet(...args),
    create: (...args: unknown[]) => mockDashboardClientCreate(...args),
    update: (...args: unknown[]) => mockDashboardClientUpdate(...args),
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
    mockDashboardClientGet.mockRejectedValue(
      new SavedObjectNotFound({ type: 'dashboard', id: 'missing-id' })
    );
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
      expect(
        screen.getByText(/does not contain valid JSON/)
      ).toBeInTheDocument()
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

  describe('when the imported JSON carries an id that already exists', () => {
    const STATE_WITH_ID = { id: 'existing-id', data: VALID_STATE };
    const fileWithId = new File([JSON.stringify(STATE_WITH_ID)], 'dashboard.json', {
      type: 'application/json',
    });

    beforeEach(() => {
      mockDashboardClientGet.mockResolvedValue({ id: 'existing-id', data: VALID_STATE });
    });

    it('shows the conflict callout', async () => {
      renderFlyout();
      await pickFile(fileWithId);
      await waitFor(() =>
        expect(screen.getByTestId('importDashboardJsonConflict')).toBeInTheDocument()
      );
    });

    it('creates a new copy by default', async () => {
      renderFlyout();
      await pickFile(fileWithId);
      await waitFor(() =>
        expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled()
      );
      await act(async () => {
        await userEvent.click(screen.getByTestId('importDashboardJsonImportButton'));
      });
      await waitFor(() => expect(mockDashboardClientCreate).toHaveBeenCalled());
      expect(mockDashboardClientUpdate).not.toHaveBeenCalled();
    });

    it('overwrites when the user chooses overwrite', async () => {
      mockDashboardClientUpdate.mockResolvedValue({ id: 'existing-id', data: VALID_STATE });
      renderFlyout();
      await pickFile(fileWithId);
      await waitFor(() =>
        expect(screen.getByTestId('importDashboardJsonConflict')).toBeInTheDocument()
      );
      await act(async () => {
        await userEvent.click(screen.getByRole('radio', { name: /Overwrite/i }));
      });
      await act(async () => {
        await userEvent.click(screen.getByTestId('importDashboardJsonImportButton'));
      });
      await waitFor(() =>
        expect(mockDashboardClientUpdate).toHaveBeenCalledWith('existing-id', VALID_STATE)
      );
      expect(mockDashboardClientCreate).not.toHaveBeenCalled();
    });
  });
});
