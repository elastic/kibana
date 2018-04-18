import React from 'react';
import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

export function getEditPanelAction() {
  return new DashboardPanelAction({
    displayName: 'Edit visualization',
    id: 'editPanel',
    icon: <span
      aria-hidden="true"
      className="kuiButton__icon kuiIcon fa-edit"
    />,
    onClick: ({ embeddable }) => { window.location = embeddable.metadata.editUrl; },
    disabled: ({ embeddable }) => (!embeddable.metadata || !embeddable.metadata.editUrl),
  });
}
