/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { MaintenanceWindow, MaintenanceWindowStatus, KibanaServices } from './types';
import { useFetchActiveMaintenanceWindows } from './use_fetch_active_maintenance_windows';

const MAINTENANCE_WINDOW_FEATURE_ID = 'maintenanceWindow';
const MAINTENANCE_WINDOW_RUNNING = i18n.translate(
  'alertsUIShared.maintenanceWindowCallout.maintenanceWindowActive',
  {
    defaultMessage: 'Maintenance window is running',
  }
);
const MAINTENANCE_WINDOW_RUNNING_DESCRIPTION = i18n.translate(
  'alertsUIShared.maintenanceWindowCallout.maintenanceWindowActiveDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);

export function MaintenanceWindowCallout({
  kibanaServices,
}: {
  kibanaServices: KibanaServices;
}): JSX.Element | null {
  const {
    application: { capabilities },
  } = kibanaServices;

  const isMaintenanceWindowDisabled =
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].show &&
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].save;
  const { data } = useFetchActiveMaintenanceWindows(kibanaServices, {
    enabled: !isMaintenanceWindowDisabled,
  });

  if (isMaintenanceWindowDisabled) {
    return null;
  }

  const activeMaintenanceWindows = (data as MaintenanceWindow[]) || [];

  if (activeMaintenanceWindows.some(({ status }) => status === MaintenanceWindowStatus.Running)) {
    return (
      <EuiCallOut
        title={MAINTENANCE_WINDOW_RUNNING}
        color="warning"
        iconType="iInCircle"
        data-test-subj="maintenanceWindowCallout"
      >
        {MAINTENANCE_WINDOW_RUNNING_DESCRIPTION}
      </EuiCallOut>
    );
  }

  return null;
}
