/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { MaintenanceWindowStatus, KibanaServices } from './types';
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
  categories,
}: {
  kibanaServices: KibanaServices;
  categories?: string[];
}): JSX.Element | null {
  const {
    application: { capabilities },
  } = kibanaServices;

  const isMaintenanceWindowDisabled =
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].show &&
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].save;
  const { data: activeMaintenanceWindows = [] } = useFetchActiveMaintenanceWindows(kibanaServices, {
    enabled: !isMaintenanceWindowDisabled,
  });

  const shouldShowMaintenanceWindowCallout = useMemo(() => {
    if (!activeMaintenanceWindows) {
      return false;
    }
    if (activeMaintenanceWindows.length === 0) {
      return false;
    }
    if (!Array.isArray(categories)) {
      return true;
    }

    return activeMaintenanceWindows.some(({ status, categoryIds }) => {
      if (status !== MaintenanceWindowStatus.Running) {
        return false;
      }
      if (!Array.isArray(categoryIds)) {
        return true;
      }
      return categoryIds.some((category) => categories.includes(category));
    });
  }, [categories, activeMaintenanceWindows]);

  if (isMaintenanceWindowDisabled) {
    return null;
  }

  if (!shouldShowMaintenanceWindowCallout) {
    return null;
  }

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
