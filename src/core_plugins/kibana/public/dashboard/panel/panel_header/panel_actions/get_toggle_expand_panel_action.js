import React from 'react';
import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

export function getToggleExpandPanelAction({ isExpanded, toggleExpandedPanel }) {
  return new DashboardPanelAction({
    displayName: isExpanded ? 'Minimize' : 'Full screen',
    id: 'togglePanel',
    icon: <span
      aria-hidden="true"
      className={`kuiButton__icon kuiIcon ${isExpanded ? 'fa-compress' : 'fa-expand'}`}
    />,
    onClick: toggleExpandedPanel,
  });
}
