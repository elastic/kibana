/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from '@kbn/alerting-types';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CasesCell } from './cases_cell';
import { AdditionalContext, CellComponentProps, RenderContext } from '../types';
import { getCasesMapMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';
import { useCaseViewNavigation } from '../hooks/use_case_view_navigation';
import { createPartialObjectMock } from '../utils/test';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

jest.mock('../hooks/use_case_view_navigation');

const useCaseViewNavigationMock = jest.mocked(useCaseViewNavigation);
const casesMap = getCasesMapMock();
const maintenanceWindowsMap = getMaintenanceWindowsMapMock();
const alert: Alert = {
  _id: 'alert-id',
  _index: 'alert-index',
  'kibana.alert.case_ids': ['test-id'],
};

const props = createPartialObjectMock<CellComponentProps>({
  isLoading: false,
  alert,
  cases: casesMap,
  maintenanceWindows: maintenanceWindowsMap,
  columnId: 'kibana.alert.case_ids',
  showAlertStatusWithFlapping: false,
});

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: {
    application: applicationServiceMock.createStartContract(),
  },
});

const navigateToCaseView = jest.fn();
useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });

const TestComponent = (_props: CellComponentProps) => (
  <IntlProvider locale="en">
    <AlertsTableContextProvider value={context}>
      <CasesCell {..._props} />
    </AlertsTableContextProvider>
  </IntlProvider>
);

describe('CasesCell', () => {
  it('renders the cases cell', async () => {
    render(<TestComponent {...props} />);
    expect(screen.getByText('Test case')).toBeInTheDocument();
  });

  it('renders the loading skeleton', async () => {
    render(<TestComponent {...props} isLoading={true} />);
    expect(screen.getByTestId('cases-cell-loading')).toBeInTheDocument();
  });

  it('renders multiple cases correctly', async () => {
    render(
      <TestComponent
        {...props}
        alert={{ ...alert, 'kibana.alert.case_ids': ['test-id', 'test-id-2'] }}
      />
    );

    expect(screen.getByText('Test case')).toBeInTheDocument();
    expect(screen.getByText('Test case 2')).toBeInTheDocument();
  });

  it('does not render a case that it is in the map but not in the alerts data', async () => {
    render(<TestComponent {...props} />);

    expect(screen.getByText('Test case')).toBeInTheDocument();
    expect(screen.queryByText('Test case 2')).not.toBeInTheDocument();
  });

  it('does not show any cases when the alert does not have any case ids', async () => {
    render(<TestComponent {...props} alert={{ ...alert, 'kibana.alert.case_ids': [] }} />);

    expect(screen.queryByText('Test case')).not.toBeInTheDocument();
    expect(screen.queryByText('Test case 2')).not.toBeInTheDocument();
  });

  it('does show the default value when the alert does not have any case ids', async () => {
    render(<TestComponent {...props} alert={{ ...alert, 'kibana.alert.case_ids': [] }} />);

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('does not show any cases when the alert has invalid case ids', async () => {
    render(
      <TestComponent {...props} alert={{ ...alert, 'kibana.alert.case_ids': ['not-exist'] }} />
    );

    expect(screen.queryByTestId('cases-cell-link')).not.toBeInTheDocument();
  });

  it('does show the default value when the alert has invalid case ids', async () => {
    render(
      <TestComponent {...props} alert={{ ...alert, 'kibana.alert.case_ids': ['not-exist'] }} />
    );

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows the cases tooltip', async () => {
    render(<TestComponent {...props} />);
    expect(screen.getByText('Test case')).toBeInTheDocument();

    await userEvent.hover(screen.getByText('Test case'));

    expect(await screen.findByTestId('cases-components-tooltip')).toBeInTheDocument();
  });

  it('navigates to the case correctly', async () => {
    render(<TestComponent {...props} />);
    expect(screen.getByText('Test case')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Test case'));
    expect(navigateToCaseView).toBeCalledWith({ caseId: 'test-id' });
  });
});
