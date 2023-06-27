/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

enum MaintenanceWindowStatus {
  Running = 'running',
  Upcoming = 'upcoming',
  Finished = 'finished',
  Archived = 'archived',
}

interface MaintenanceWindowModificationMetadata {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DateRange {
  gte: string;
  lte: string;
}

interface MaintenanceWindowSOProperties {
  title: string;
  enabled: boolean;
  duration: number;
  expirationDate: string;
  events: DateRange[];
  rRule: RRuleParams;
}

type MaintenanceWindowSOAttributes = MaintenanceWindowSOProperties &
  MaintenanceWindowModificationMetadata;

type MaintenanceWindow = MaintenanceWindowSOAttributes & {
  status: MaintenanceWindowStatus;
  eventStartTime: string | null;
  eventEndTime: string | null;
  id: string;
};
const MAINTENANCE_WINDOW_FEATURE_ID = 'maintenanceWindow';

const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH = `/internal/alerting/rules/maintenance_window`;
const FETCH_ERROR = i18n.translate('xpack.alerting.maintenanceWindowCallout.fetchError', {
  defaultMessage: 'Failed to check if maintenance windows are active',
});

const FETCH_ERROR_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.fetchErrorDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);

const MAINTENANCE_WINDOW_RUNNING = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.maintenanceWindowActive',
  {
    defaultMessage: 'Maintenance window is running',
  }
);
const MAINTENANCE_WINDOW_RUNNING_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.maintenanceWindowActiveDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);

export function MaintenanceWindowCallout({
  kibanaServices,
}: {
  kibanaServices: CoreStart;
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

  const activeMaintenanceWindows = data || [];

  if (
    activeMaintenanceWindows.some(
      ({ status }: { status: MaintenanceWindowStatus }) =>
        status === MaintenanceWindowStatus.Running
    )
  ) {
    return (
      <EuiCallOut title={MAINTENANCE_WINDOW_RUNNING} color="warning" iconType="iInCircle">
        {MAINTENANCE_WINDOW_RUNNING_DESCRIPTION}
      </EuiCallOut>
    );
  }

  return null;
}

const useFetchActiveMaintenanceWindows = (
  { http, notifications: { toasts } }: CoreStart,
  { enabled }: Pick<UseQueryOptions, 'enabled'>
): Promise<MaintenanceWindow[]> => {
  const fetchActiveMaintenanceWindows = async (signal?: AbortSignal) =>
    http.fetch(INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH, {
      method: 'GET',
      signal,
    });

  return useQuery(
    ['GET', INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH],
    ({ signal }) => fetchActiveMaintenanceWindows(signal),
    {
      enabled,
      refetchInterval: 60000,
      onError: (error: Error) => {
        toasts.addError(error, { title: FETCH_ERROR, toastMessage: FETCH_ERROR_DESCRIPTION });
      },
    }
  );
};
