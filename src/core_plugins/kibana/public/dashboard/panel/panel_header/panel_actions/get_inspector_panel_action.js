import React from 'react';

import {
  EuiIcon,
} from '@elastic/eui';

import { hasInspector, openInspector } from 'ui/inspector';
import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

/**
 * Returns the dashboard panel action for opening an inspector for a specific panel.
 * This will check if the embeddable inside the panel actually exposes inspector adapters
 * via its embeddable.getInspectorAdapters() metod. If so - and if an inspector
 * could be shown for those adapters - the inspector icon will be visible.
 * @return {DashboardPanelAction}
 */
export function getInspectorPanelAction({ closeContextMenu }) {
  return new DashboardPanelAction({
    displayName: 'Inspector',
    id: 'openInspector',
    // TODO: Use proper inspector icon once available
    icon: <EuiIcon type="eye" />,
    parentPanelId: 'mainMenu',
    onClick: ({ embeddable }) => {
      closeContextMenu();
      openInspector(embeddable.getInspectorAdapters());
    },
    isVisible: ({ embeddable }) => (
      embeddable && embeddable.getInspectorAdapters && hasInspector(embeddable.getInspectorAdapters())
    ),
  });
}
