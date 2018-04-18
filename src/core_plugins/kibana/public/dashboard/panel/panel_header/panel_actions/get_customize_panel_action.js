import React from 'react';

import { PanelOptionsMenuForm } from '../panel_options_menu_form';
import { DashboardPanelAction, DashboardContextMenuPanel } from 'ui/dashboard_panel_actions';

export function getCustomizePanelAction({ onResetPanelTitle, onUpdatePanelTitle, title, closeContextMenu }) {
  return  new DashboardPanelAction({
    displayName: 'Customize panel',
    id: 'customizePanel',
    icon: <span
      aria-hidden="true"
      className="kuiButton__icon kuiIcon fa-edit"
    />,
    childContextMenuPanel: new DashboardContextMenuPanel({
      id: 'panelSubOptionsMenu',
      title: 'Customize panel',
      getContent: () => (<PanelOptionsMenuForm
        onReset={onResetPanelTitle}
        onUpdatePanelTitle={onUpdatePanelTitle}
        title={title}
        onClose={closeContextMenu}
      />),
    }),
  });
}
