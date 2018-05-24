import React from 'react';
import {
  EuiIcon,
} from '@elastic/eui';

import { DashboardPanelAction } from 'ui/dashboard_panel_actions';
import { DashboardViewMode } from '../../../dashboard_view_mode';

/**
 *
 * @param {function} onDeletePanel
 * @return {DashboardPanelAction}
 */
export function getRemovePanelAction(onDeletePanel) {
  return new DashboardPanelAction({
    displayName: 'Delete from dashboard',
    id: 'deletePanel',
    parentPanelId: 'mainMenu',
    icon: <EuiIcon type="trash" />,
    isVisible: ({ containerState }) => (
      containerState.viewMode === DashboardViewMode.EDIT && !containerState.isPanelExpanded
    ),
    onClick: onDeletePanel,
  });
}
