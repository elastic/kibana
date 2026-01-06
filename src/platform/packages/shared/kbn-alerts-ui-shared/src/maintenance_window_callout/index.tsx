/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import type { KibanaServices } from './types';
import { MaintenanceWindowStatus } from './types';
import { useFetchActiveMaintenanceWindows } from './use_fetch_active_maintenance_windows';
import { MAINTENANCE_WINDOW_FEATURE_ID } from './constants';
import {
  MAINTENANCE_WINDOW_NO_CATEGORY_TITLE,
  MAINTENANCE_WINDOW_RUNNING_DESCRIPTION,
  MAINTENANCE_WINDOW_PAGE_LINK_TEXT,
} from './translations';

export const MAINTENANCE_WINDOWS_PAGE = '/app/management/insightsAndAlerting/maintenanceWindows';

export function MaintenanceWindowCallout({
  kibanaServices,
  categories,
}: {
  kibanaServices: KibanaServices;
  categories?: string[];
}): JSX.Element | null {
  const {
    application: { capabilities },
    http,
  } = kibanaServices;

  const isMaintenanceWindowDisabled =
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID]?.show &&
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID]?.save;
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

    // If categories is omitted, always display the callout
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

  const maintenanceWindowPageLink = (
    <EuiLink
      href={http.basePath.prepend(MAINTENANCE_WINDOWS_PAGE)}
      data-test-subj="maintenanceWindowPageLink"
    >
      {MAINTENANCE_WINDOW_PAGE_LINK_TEXT}
    </EuiLink>
  );

  return (
    <EuiCallOut
      title={MAINTENANCE_WINDOW_NO_CATEGORY_TITLE}
      color="warning"
      iconType="info"
      data-test-subj="maintenanceWindowCallout"
    >
      {MAINTENANCE_WINDOW_RUNNING_DESCRIPTION} {maintenanceWindowPageLink}
    </EuiCallOut>
  );
}
