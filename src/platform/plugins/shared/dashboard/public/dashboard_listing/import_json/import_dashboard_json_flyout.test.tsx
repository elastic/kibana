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
const mockGetIdsWithTitle = jest.fn();
jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    http: { post: (...args: unknown[]) => mockHttpPost(...args) },
    notifications: { toasts: { addDanger: (...args: unknown[]) => mockAddDanger(...args) } },
    application: {
      getUrlForApp: () => '/app/management/kibana/objects',
    },
  },
  dataService: {
    dataViews: { getIdsWithTitle: (...args: unknown[]) => mockGetIdsWithTitle(...args) },
  },
}));

const DATA_VIEW_RELATED_ITEM = { type: 'index-pattern', type_label: 'Data view', id: 'logs-dv' };

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
    mockSanitizeDashboard.mockResolvedValue({
      data: SANITIZED_STATE,
      warnings: [],
      relatedItems: [],
      relatedItemsCount: 0,
    });
    mockHttpPost.mockResolvedValue({ id: 'new-id', data: SANITIZED_STATE });
    mockGetIdsWithTitle.mockResolvedValue([{ id: 'logs-dv', title: 'logs-*' }]);
  });

  it('adapts dashboard sanitization, creation, and success behavior', async () => {
    const user = userEvent.setup();
    const onImportSuccess = jest.fn();
    const closeFlyout = jest.fn();
    renderFlyout(onImportSuccess, closeFlyout);
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled()
    );
    expect(mockSanitizeDashboard).toHaveBeenCalledWith(UNSANITIZED_STATE, expect.any(AbortSignal));
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

  it('uses the dashboard-specific warnings summary', async () => {
    mockSanitizeDashboard.mockResolvedValue({
      data: SANITIZED_STATE,
      warnings: ['A property was removed'],
      relatedItems: [],
      relatedItemsCount: 0,
    });
    renderFlyout();

    await pickFile(VALID_FILE);

    expect(
      await screen.findByText(/1 item removed from the imported dashboard/)
    ).toBeInTheDocument();
  });

  it('warns about data views that do not exist in this space but still allows import', async () => {
    mockSanitizeDashboard.mockResolvedValue({
      data: SANITIZED_STATE,
      warnings: [],
      relatedItems: [DATA_VIEW_RELATED_ITEM],
      relatedItemsCount: 1,
    });
    mockGetIdsWithTitle.mockResolvedValue([]);
    renderFlyout();

    await pickFile(VALID_FILE);

    await waitFor(() =>
      expect(screen.getByTestId('importDashboardJsonMissingRelatedItemsSummary')).toHaveTextContent(
        'This dashboard uses a data view that doesn’t exist in this space.'
      )
    );
    expect(screen.queryByTestId('importDashboardJsonRelatedItemsSummary')).not.toBeInTheDocument();
    expect(screen.getByTestId('importDashboardJsonImportButton')).toBeEnabled();
  });

  it('shows the server message for a 4xx sanitize error', async () => {
    const user = userEvent.setup();
    mockSanitizeDashboard.mockRejectedValue(
      Object.assign(new Error('Bad Request'), {
        request: {},
        response: { status: 400 },
        body: { message: '[request body]: bad title' },
      })
    );
    renderFlyout();
    await pickFile(VALID_FILE);
    await screen.findByTestId('importDashboardJsonServerError');
    await user.click(
      within(screen.getByTestId('importDashboardJsonServerErrorDetailsAccordion')).getByRole(
        'button'
      )
    );
    expect(screen.getAllByText('[request body]: bad title')[0]).toBeInTheDocument();
  });
});
