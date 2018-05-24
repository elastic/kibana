import React from 'react';
import {
  EuiIcon,
} from '@elastic/eui';
import { PanelOptionsMenuForm } from '../panel_options_menu_form';
import { DashboardPanelAction, DashboardContextMenuPanel } from 'ui/dashboard_panel_actions';
import { DashboardViewMode } from '../../../dashboard_view_mode';

/**
 *
 * @param {function} onResetPanelTitle
 * @param {function} onUpdatePanelTitle
 * @param {string} title
 * @param {function} closeContextMenu
 * @return {DashboardPanelAction}
 */
export function getCustomizePanelAction({ onResetPanelTitle, onUpdatePanelTitle, title, closeContextMenu }) {
  return new DashboardPanelAction({
    displayName: 'Customize panel',
    id: 'customizePanel',
    parentPanelId: 'mainMenu',
    icon: <EuiIcon type="pencil" />,
    isVisible: ({ containerState }) => (containerState.viewMode === DashboardViewMode.EDIT),
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
