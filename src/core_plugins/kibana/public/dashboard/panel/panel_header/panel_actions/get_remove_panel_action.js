import React from 'react';
import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

export function getRemovePanelAction(onDeletePanel) {
  return new DashboardPanelAction({
    displayName: 'Delete from dashboard',
    id: 'deletePanel',
    icon: <span
      aria-hidden="true"
      className="kuiButton__icon kuiIcon fa-trash"
    />,
    onClick: onDeletePanel,
  });
}
