/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { FilesClient } from '@kbn/files-plugin/public';
import { App } from './app';
import { FilesManagementAppContextProvider } from './context';
import { i18nTexts } from './i18n_texts';

jest.mock('@kbn/content-management-table-list-view-table', () => ({
  TableListViewTable: () => <div data-test-subj="filesManagementTable" />,
}));

jest.mock('./components/diagnostics_flyout', () => ({
  DiagnosticsFlyout: () => <div data-test-subj="diagnosticsFlyout" />,
}));

const renderApp = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <MockAppHeaderProvider>
          <FilesManagementAppContextProvider
            filesClient={{} as FilesClient}
            getFileKindDefinition={jest.fn()}
            getAllFindKindDefinitions={jest.fn().mockReturnValue([])}
          >
            <App />
          </FilesManagementAppContextProvider>
        </MockAppHeaderProvider>
      </I18nProvider>
    </EuiProvider>
  );

describe('Files management AppHeader', () => {
  it('renders the Files header, description, and Statistics action', async () => {
    renderApp();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      i18nTexts.tableListTitle
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      i18nTexts.tableListDescription
    );
    expect(screen.getByTestId('filesManagementApp')).toBeInTheDocument();
    expect(screen.getByTestId('filesManagementTable')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('filesManagementOpenDiagnosticsFlyoutButton')).toBeInTheDocument();
    });
  });

  it('opens the Statistics flyout from the AppHeader primary action', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('filesManagementOpenDiagnosticsFlyoutButton')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('diagnosticsFlyout')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('filesManagementOpenDiagnosticsFlyoutButton'));

    expect(screen.getByTestId('diagnosticsFlyout')).toBeInTheDocument();
  });
});
