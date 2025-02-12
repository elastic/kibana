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
import { Alert } from '@kbn/alerting-types';
import { AlertLifecycleStatusCell } from './alert_lifecycle_status_cell';
import { CellComponentProps } from '../types';
import { getCasesMapMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMapMock } from '../mocks/maintenance_windows.mock';

describe('AlertLifecycleStatusCell', () => {
  const casesMap = getCasesMapMock();
  const maintenanceWindowsMap = getMaintenanceWindowsMapMock();
  const alert: Alert = {
    _id: 'alert-id',
    _index: 'alert-index',
    'kibana.alert.status': ['active'],
  };

  const props = {
    isLoading: false,
    alert,
    cases: casesMap,
    maintenanceWindows: maintenanceWindowsMap,
    columnId: 'kibana.alert.status',
    showAlertStatusWithFlapping: true,
    // Assertion used to avoid defining all the (numerous) context properties
  } as CellComponentProps;

  it('shows the status', async () => {
    render(<AlertLifecycleStatusCell {...props} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not shows the status if showAlertStatusWithFlapping=false', async () => {
    render(<AlertLifecycleStatusCell {...props} showAlertStatusWithFlapping={false} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('shows the status with flapping', async () => {
    render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.flapping': ['true'] }}
      />
    );
    expect(screen.getByText('Flapping')).toBeInTheDocument();
  });

  it('shows the status with multiple values', async () => {
    render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.status': ['active', 'recovered'] }}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the default cell if the status is empty', async () => {
    render(<AlertLifecycleStatusCell {...props} alert={{ ...alert, 'kibana.alert.status': [] }} />);

    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
