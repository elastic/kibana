import React from 'react';
import {
  EuiIcon,
} from '@elastic/eui';

import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

/**
 *
 * @param {function} onDeletePanel
 * @return {DashboardPanelAction}
 */
export function getRemovePanelAction(onDeletePanel) {
  return new DashboardPanelAction({
    displayName: 'Delete from dashboard',
    id: 'deletePanel',
    icon: <EuiIcon
      type="trash"
    />,
    onClick: onDeletePanel,
  });
}
