import React from 'react';
import {
  EuiIcon,
} from '@elastic/eui';

import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

/**
 * Returns an action that toggles the panel into maximized or minimized state.
 * @param {boolean} isExpanded
 * @param {function} toggleExpandedPanel
 * @return {DashboardPanelAction}
 */
export function getToggleExpandPanelAction({ isExpanded, toggleExpandedPanel }) {
  return new DashboardPanelAction({
    displayName: isExpanded ? 'Minimize' : 'Full screen',
    id: 'togglePanel',
    parentPanelId: 'mainMenu',
    // TODO: Update to minimize icon when https://github.com/elastic/eui/issues/837 is complete.
    icon: <EuiIcon type={isExpanded ? 'expand' : 'expand'} />,
    onClick: toggleExpandedPanel,
  });
}
