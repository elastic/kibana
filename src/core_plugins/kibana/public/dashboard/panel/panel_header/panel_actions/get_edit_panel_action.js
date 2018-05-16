import React from 'react';

import {
  EuiIcon,
} from '@elastic/eui';

import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

/**
 *
 * @return {DashboardPanelAction}
 */
export function getEditPanelAction() {
  return new DashboardPanelAction({
    displayName: 'Edit visualization',
    id: 'editPanel',
    icon: <EuiIcon type="pencil" />,
    onClick: ({ embeddable }) => { window.location = embeddable.metadata.editUrl; },
    disabled: ({ embeddable }) => (!embeddable.metadata || !embeddable.metadata.editUrl),
  });
}
