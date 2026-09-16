/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { ImportDashboardJsonFlyout } from './import_dashboard_json_flyout';

const mockSanitizeDashboard = jest.fn();
jest.mock('../../dashboard_app/top_nav/share/export_json/sanitize_dashboard', () => ({
  sanitizeDashboard: (...args: unknown[]) => mockSanitizeDashboard(...args),
}));

const mockAddDanger = jest.fn();
const mockHttpPost = jest.fn();
jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    http: { post: (...args: unknown[]) => mockHttpPost(...args) },
    notifications: { toasts: { addDanger: (...args: unknown[]) => mockAddDanger(...args) } },
    application: {
      getUrlForApp: () => '/app/management/kibana/objects',
    },
  },
}));

const SANITIZED_STATE = { title: 'My Dashboard', panels: [], description: '' };
const UNSANITIZED_STATE = { ...SANITIZED_STATE, property_removed_by_sanitizer: 'remove me' };
const VALID_FILE = new File([JSON.stringify(UNSANITIZED_STATE)], 'dashboard.json', {
  type: 'application/json',
});

const renderFlyout = (onImportSuccess = jest.fn(), closeFlyout = jest.fn()) =>
  render(
    <I18nProvider>
      <ImportDashboardJsonFlyout
        closeFlyout={closeFlyout}
        onImportSuccess={onImportSuccess}
        titleId="import-dashboard-json-title"
      />
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
    mockSanitizeDashboard.mockResolvedValue({ data: SANITIZED_STATE, warnings: [] });
    mockHttpPost.mockResolvedValue({ id: 'new-id', data: SANITIZED_STATE });
  });

  it('renders the file picker and NDJSON note', () => {
    renderFlyout();
    expect(screen.getByTestId('importDashboardJsonFilePicker')).toBeInTheDocument();
    expect(screen.getByTestId('importDashboardJsonTechnicalPreviewBadge')).toBeInTheDocument();
    expect(screen.getByText(/exported from Dashboard application/)).toBeInTheDocument();
  });

  it('shows a JSON parse error when the file is not valid JSON', async () => {
    renderFlyout();
    const badFile = new File(['not json }{'], 'bad.json', { type: 'application/json' });
    await pickFile(badFile);
    await waitFor(() =>
      expect(screen.getByText(/does not contain valid JSON/)).toBeInTheDocument()
    );
    expect(mockSanitizeDashboard).not.toHaveBeenCalled();
  });

  it('shows the server error callout when sanitize rejects the file', async () => {
    mockSanitizeDashboard.mockRejectedValue(new Error('schema validation failed: missing title'));
    renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonServerError')).toBeInTheDocument()
    );
    expect(screen.getByText(/could not be imported/)).toBeInTheDocument();
    expect(screen.getByTestId('importDashboardJsonImportButton')).toBeDisabled();
  });

  it('calls sanitize and enables Import after a valid file is chosen', async () => {
    renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(mockSanitizeDashboard).toHaveBeenCalledWith(UNSANITIZED_STATE, expect.any(AbortSignal))
    );
    expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled();
  });

  it('displays sanitize warnings above the file picker but still allows import', async () => {
    const user = userEvent.setup();
    mockSanitizeDashboard.mockResolvedValue({
      data: SANITIZED_STATE,
      warnings: ['Panel "chart-1" could not be loaded'],
    });
    renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonWarnings')).toBeInTheDocument()
    );
    expect(screen.getByText(/Unsupported properties were removed/)).toBeInTheDocument();
    expect(screen.getByText(/1 item removed from the imported dashboard/)).toBeInTheDocument();
    expect(screen.queryByTestId('importDashboardJsonWarningsList')).not.toBeInTheDocument();

    await user.click(screen.getByText('Show details'));
    expect(screen.getAllByTestId('importDashboardJsonWarningsList')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Panel "chart-1" could not be loaded/)[0]).toBeInTheDocument();

    const warnings = screen.getByTestId('importDashboardJsonWarnings');
    const filePicker = screen.getByTestId('importDashboardJsonFilePicker');
    const position = warnings.compareDocumentPosition(filePicker);
    expect(Math.floor(position / Node.DOCUMENT_POSITION_FOLLOWING) % 2).toBe(1);
    expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled();
  });

  it('shows related items and creates a dashboard from only the sanitized state', async () => {
    const user = userEvent.setup();
    const onImportSuccess = jest.fn();
    const closeFlyout = jest.fn();
    mockSanitizeDashboard.mockResolvedValue({
      data: SANITIZED_STATE,
      warnings: [],
      relatedItems: [{ type: 'index-pattern', type_label: 'data view', id: 'data-view-1' }],
    });
    renderFlyout(onImportSuccess, closeFlyout);
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled()
    );
    expect(screen.getByText(/1 related item might not exist/)).toBeInTheDocument();
    await user.click(
      within(screen.getByTestId('importDashboardJsonRelatedItemsAccordion')).getByRole('button')
    );
    expect(screen.getAllByText('data view')[0]).toBeInTheDocument();
    expect(screen.getAllByText('data-view-1')[0]).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByTestId('importDashboardJsonImportButton'));
    });
    await waitFor(() =>
      expect(mockHttpPost).toHaveBeenCalledWith('/api/dashboards', {
        version: '2023-10-31',
        body: JSON.stringify(SANITIZED_STATE),
      })
    );
    expect(onImportSuccess).toHaveBeenCalledWith('new-id', 'My Dashboard');
    expect(closeFlyout).toHaveBeenCalled();
  });
});
