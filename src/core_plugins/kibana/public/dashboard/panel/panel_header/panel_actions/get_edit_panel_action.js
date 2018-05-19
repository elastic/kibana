import React from 'react';

import {
  EuiIcon,
} from '@elastic/eui';

import { DashboardPanelAction } from 'ui/dashboard_panel_actions';
import { DashboardViewMode } from '../../../dashboard_view_mode';

/**
 *
 * @return {DashboardPanelAction}
 */
export function getEditPanelAction() {
  return new DashboardPanelAction({
    displayName: 'Edit visualization',
    id: 'editPanel',
    icon: <EuiIcon type="pencil" />,
    parentPanelId: 'mainMenu',
    onClick: ({ embeddable }) => { window.location = embeddable.metadata.editUrl; },
    isVisible: ({ containerState }) => (containerState.viewMode === DashboardViewMode.EDIT),
    isDisabled: ({ embeddable }) => (!embeddable || !embeddable.metadata || !embeddable.metadata.editUrl),
  });
}
