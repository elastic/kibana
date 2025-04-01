/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import { EuiSkeletonText, EuiToolTip } from '@elastic/eui';
import type { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import { ALERT_MAINTENANCE_WINDOW_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import { CellComponent } from '../types';
import { TooltipContent } from './maintenance_windows_tooltip_content';

const isMaintenanceWindowValid = (mw: MaintenanceWindow | undefined): mw is MaintenanceWindow => {
  return !!mw;
};

interface MaintenanceWindowBaseCellProps {
  maintenanceWindows: MaintenanceWindow[];
  maintenanceWindowIds: string[];
  timestamp?: string;
  isLoading: boolean;
}

export const MaintenanceWindowBaseCell = memo((props: MaintenanceWindowBaseCellProps) => {
  const { maintenanceWindows, maintenanceWindowIds, isLoading, timestamp } = props;

  const tooltipWithText = useMemo(() => {
    const totalLength = maintenanceWindows.length + maintenanceWindowIds.length;
    return (
      <>
        {maintenanceWindows.map((mw, index) => (
          <EuiToolTip
            key={`${mw.id}_tooltip`}
            content={<TooltipContent maintenanceWindow={mw} timestamp={timestamp} />}
          >
            <span key={`${mw.id}_title`}>
              {mw.title}
              {index !== totalLength - 1 && <>, &nbsp;</>}
            </span>
          </EuiToolTip>
        ))}
        {maintenanceWindowIds.map((id, index) => (
          <span key={`${id}_id`}>
            {id}
            {index + maintenanceWindows.length !== totalLength - 1 && <>, &nbsp;</>}
          </span>
        ))}
      </>
    );
  }, [maintenanceWindows, maintenanceWindowIds, timestamp]);

  return (
    <EuiSkeletonText
      data-test-subj="maintenance-window-cell-loading"
      lines={1}
      isLoading={isLoading}
      size="s"
    >
      {tooltipWithText}
    </EuiSkeletonText>
  );
});

export const MaintenanceWindowsCell: CellComponent = memo((props) => {
  const { alert, maintenanceWindows, isLoading } = props;

  const validMaintenanceWindows = useMemo(() => {
    const maintenanceWindowIds = (alert && (alert[ALERT_MAINTENANCE_WINDOW_IDS] as string[])) || [];
    return maintenanceWindowIds
      .map((id) => maintenanceWindows?.get(id))
      .filter(isMaintenanceWindowValid);
  }, [alert, maintenanceWindows]);

  const idsWithoutMaintenanceWindow = useMemo(() => {
    const maintenanceWindowIds = (alert && (alert[ALERT_MAINTENANCE_WINDOW_IDS] as string[])) || [];
    return maintenanceWindowIds.filter((id) => !maintenanceWindows?.get(id));
  }, [alert, maintenanceWindows]);

  if (validMaintenanceWindows.length === 0 && idsWithoutMaintenanceWindow.length === 0) {
    return <>--</>;
  }

  return (
    <MaintenanceWindowBaseCell
      maintenanceWindows={validMaintenanceWindows}
      maintenanceWindowIds={idsWithoutMaintenanceWindow}
      isLoading={isLoading}
      timestamp={alert && (alert[TIMESTAMP]?.[0] as string)}
    />
  );
});
