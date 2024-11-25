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
import { SystemCell } from './system_cell';
import { CellComponentProps } from '../types';
import { getCasesMapMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';
import { Alert } from '@kbn/alerting-types';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';

const casesMap = getCasesMapMock();
const maintenanceWindowsMap = getMaintenanceWindowsMapMock();

const alert = {
  _id: 'alert-id',
  _index: 'alert-index',
  'kibana.alert.status': ['active'],
  'kibana.alert.case_ids': ['test-id'],
  'kibana.alert.maintenance_window_ids': ['test-mw-id-1'],
} as Alert;

const props = {
  isLoading: false,
  alert,
  cases: casesMap,
  maintenanceWindows: maintenanceWindowsMap,
  columnId: 'kibana.alert.status',
  showAlertStatusWithFlapping: true,
  services: {
    application: applicationServiceMock.createStartContract(),
  },
} as CellComponentProps;

describe('SystemCellFactory', () => {
  it('shows the status cell', async () => {
    render(<SystemCell {...props} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the cases cell', async () => {
    render(<SystemCell {...props} columnId="kibana.alert.case_ids" />);
    expect(screen.getByText('Test case')).toBeInTheDocument();
  });

  it('shows the maintenance windows cell', async () => {
    render(<SystemCell {...props} columnId="kibana.alert.maintenance_window_ids" />);
    expect(screen.getByText('test-title')).toBeInTheDocument();
  });

  it('shows the cell if the columnId is not registered to the map', async () => {
    render(<SystemCell {...props} columnId="kibana.alert.end" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
