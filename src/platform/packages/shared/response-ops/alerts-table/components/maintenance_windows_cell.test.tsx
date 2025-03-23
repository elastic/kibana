/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import { MaintenanceWindowsCell } from './maintenance_windows_cell';
import { CellComponentProps } from '../types';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';
import { getCasesMapMock } from '../mocks/cases.mock';
import { Alert } from '@kbn/alerting-types';
import { createPartialObjectMock } from '../utils/test';

const casesMap = getCasesMapMock();
const maintenanceWindowsMap = getMaintenanceWindowsMapMock();
const alert: Alert = {
  _id: 'alert-id',
  _index: 'alert-index',
  [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-1', 'test-mw-id-2'],
};

const props = createPartialObjectMock<CellComponentProps>({
  isLoading: false,
  alert,
  cases: casesMap,
  maintenanceWindows: maintenanceWindowsMap,
  columnId: ALERT_MAINTENANCE_WINDOW_IDS,
  showAlertStatusWithFlapping: false,
});

describe('MaintenanceWindowsCell', () => {
  it('renders the maintenance window cell', async () => {
    render(<MaintenanceWindowsCell {...props} />);
    expect(screen.getByText('test-title,')).toBeInTheDocument();
  });

  it('renders the loading skeleton', async () => {
    render(<MaintenanceWindowsCell {...props} isLoading={true} />);
    expect(screen.getByTestId('maintenance-window-cell-loading')).toBeInTheDocument();
  });

  it('shows the tooltip', async () => {
    render(<MaintenanceWindowsCell {...props} />);
    expect(screen.getByText('test-title,')).toBeInTheDocument();
    await userEvent.hover(screen.getByText('test-title,'));
    expect(await screen.findByTestId('maintenance-window-tooltip-content')).toBeInTheDocument();
  });

  it('renders the maintenance window IDs if the endpoint could not be fetched', async () => {
    render(<MaintenanceWindowsCell {...props} maintenanceWindows={new Map()} />);
    expect(screen.queryByText('test-title,')).not.toBeInTheDocument();
    expect(screen.queryByText('test-title-2')).not.toBeInTheDocument();
    expect(screen.getByText('test-mw-id-1,')).toBeInTheDocument();
    expect(screen.getByText('test-mw-id-2')).toBeInTheDocument();
  });
});
