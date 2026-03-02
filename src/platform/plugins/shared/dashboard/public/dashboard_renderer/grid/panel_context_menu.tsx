/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPortal,
  EuiPopover,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import {
  applySelectedPanelsLayout,
  type SelectedPanelsLayoutMode,
} from '../../dashboard_api/layout_manager/apply_selected_panels_layout';
import {
  dashboardClonePanelActionStrings,
  dashboardCopyToDashboardActionStrings,
  dashboardPanelContextMenuStrings,
} from '../../dashboard_actions/_dashboard_actions_strings';
import { CopyToDashboardModal } from '../../dashboard_actions/copy_to_dashboard_modal';
import { coreServices } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';

export interface PanelContextMenuContextValue {
  openContextMenu: (panelId: string, position: { x: number; y: number }) => void;
}

export const PanelContextMenuContext = React.createContext<PanelContextMenuContextValue | null>(null);

export const SelectionPreviewContext = React.createContext<Set<string>>(new Set());

export interface PanelContextMenuProps {
  panelId: string | null;
  position: { x: number; y: number } | null;
  selectedPanelIds: Set<string>;
  onClose: () => void;
}

export const PanelContextMenu = ({
  panelId,
  position,
  selectedPanelIds,
  onClose,
}: PanelContextMenuProps) => {
  const dashboardApi = useDashboardApi();

  const effectivePanelIds = useMemo(() => {
    if (!panelId) return new Set<string>();
    return selectedPanelIds.has(panelId) ? selectedPanelIds : new Set([panelId]);
  }, [panelId, selectedPanelIds]);

  const handleDuplicate = useCallback(async () => {
    const ids = Array.from(effectivePanelIds);
    if (ids.length === 0) {
      onClose();
      return;
    }
    try {
      if (ids.length === 1 && dashboardApi.duplicatePanel) {
        await dashboardApi.duplicatePanel(ids[0]);
      } else if (dashboardApi.duplicatePanels) {
        await dashboardApi.duplicatePanels(ids);
      } else {
        for (const id of ids) {
          try {
            await dashboardApi.duplicatePanel(id);
          } catch {
            // skip
          }
        }
      }
    } finally {
      onClose();
    }
  }, [dashboardApi, effectivePanelIds, onClose]);

  const handleRemove = useCallback(() => {
    const ids = Array.from(effectivePanelIds);
    if (ids.length === 0) {
      onClose();
      return;
    }
    try {
      if (ids.length === 1 && dashboardApi.removePanel) {
        dashboardApi.removePanel(ids[0], { captureForUndo: true });
      } else if (dashboardApi.removePanels) {
        dashboardApi.removePanels(ids, { captureForUndo: true });
      } else {
        ids.forEach((id) => {
          try {
            dashboardApi.removePanel(id, { captureForUndo: true });
          } catch {
            // skip
          }
        });
      }
    } finally {
      const nextSelected = new Set(selectedPanelIds);
      effectivePanelIds.forEach((id) => nextSelected.delete(id));
      dashboardApi.setSelectedPanelIds(nextSelected);
      onClose();
    }
  }, [dashboardApi, effectivePanelIds, selectedPanelIds, onClose]);

  const handleGroup = useCallback(() => {
    if (effectivePanelIds.size < 2) return;
    dashboardApi.movePanelsToNewSection(Array.from(effectivePanelIds));
    onClose();
  }, [dashboardApi, effectivePanelIds, onClose]);

  const handleLayoutSubAction = useCallback(
    (which: SelectedPanelsLayoutMode) => {
      const ids = Array.from(effectivePanelIds);
      if (ids.length === 0) {
        onClose();
        return;
      }
      const layout = dashboardApi.layout$.getValue();
      const snapshot = {
        ...layout,
        panels: Object.fromEntries(
          Object.entries(layout.panels).map(([id, p]) => [id, { ...p, grid: { ...p.grid } }])
        ),
      };
      if (dashboardApi.pushUndo) {
        dashboardApi.pushUndo(async () => {
          dashboardApi.layout$.next(snapshot);
        });
      }
      const nextLayout = applySelectedPanelsLayout(layout, effectivePanelIds, which);
      dashboardApi.layout$.next(nextLayout);
      onClose();
    },
    [dashboardApi, effectivePanelIds, onClose]
  );

  const handleCopyToDashboard = useCallback(() => {
    if (!panelId || effectivePanelIds.size === 0) {
      onClose();
      return;
    }
    dashboardApi.setSelectedPanelIds(effectivePanelIds);
    onClose();
    const layout = dashboardApi.layout$.getValue();
    const panelLayout = layout.panels[panelId];
    const panelType = panelLayout?.type ?? 'unknown';
    const api = {
      type: panelType,
      uuid: panelId,
      parentApi: dashboardApi,
    };
    const session = coreServices.overlays.openModal(
      toMountPoint(
        <CopyToDashboardModal closeModal={() => session.close()} api={api} />,
        coreServices
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  }, [dashboardApi, panelId, effectivePanelIds, onClose]);

  const canCopyToDashboard = useMemo(() => {
    const { createNew: canCreateNew, showWriteControls: canEditExisting } =
      getDashboardCapabilities();
    return Boolean(canCreateNew || canEditExisting);
  }, []);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const canGroup = effectivePanelIds.size >= 2;
    const layoutSubPanelId = 1;
    return [
      {
        id: 0,
        title: '',
        items: [
          {
            name: dashboardClonePanelActionStrings.getDisplayName(),
            icon: 'copy',
            onClick: handleDuplicate,
            'data-test-subj': 'dashboardPanelContextMenuDuplicate',
          },
          ...(canCopyToDashboard
            ? [
                {
                  name: dashboardCopyToDashboardActionStrings.getDisplayName(),
                  icon: 'exit' as const,
                  onClick: handleCopyToDashboard,
                  'data-test-subj': 'dashboardPanelContextMenuCopyToDashboard',
                },
              ]
            : []),
          {
            name: dashboardPanelContextMenuStrings.getRemoveLabel(),
            icon: 'trash',
            onClick: handleRemove,
            'data-test-subj': 'dashboardPanelContextMenuRemove',
          },
          {
            name: dashboardPanelContextMenuStrings.getGroupLabel(),
            icon: 'folderClosed',
            onClick: handleGroup,
            disabled: !canGroup,
            'data-test-subj': 'dashboardPanelContextMenuGroup',
          },
          {
            name: dashboardPanelContextMenuStrings.getLayoutLabel(),
            icon: 'grid',
            panel: layoutSubPanelId,
            'data-test-subj': 'dashboardPanelContextMenuLayout',
          },
        ],
      },
      {
        id: layoutSubPanelId,
        title: dashboardPanelContextMenuStrings.getLayoutLabel(),
        items: [
          {
            name: dashboardPanelContextMenuStrings.getLayoutHeaderLabel(),
            icon: 'alignTop',
            onClick: () => handleLayoutSubAction('header'),
            'data-test-subj': 'dashboardPanelContextMenuLayoutHeader',
          },
          {
            name: dashboardPanelContextMenuStrings.getLayoutGridLabel(),
            icon: 'grid',
            onClick: () => handleLayoutSubAction('grid'),
            'data-test-subj': 'dashboardPanelContextMenuLayoutGrid',
          },
          {
            name: dashboardPanelContextMenuStrings.getLayoutSideLabel(),
            icon: 'boxesHorizontal',
            onClick: () => handleLayoutSubAction('side'),
            'data-test-subj': 'dashboardPanelContextMenuLayoutSide',
          },
        ],
      },
    ];
  }, [
    handleDuplicate,
    handleCopyToDashboard,
    handleRemove,
    handleGroup,
    handleLayoutSubAction,
    effectivePanelIds.size,
    canCopyToDashboard,
  ]);

  if (!position || !panelId) return null;

  return (
    <EuiPortal>
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 1,
          height: 1,
          zIndex: 9999,
        }}
        data-test-subj="dashboardPanelContextMenuAnchor"
      >
        <EuiPopover
          button={<div style={{ width: 1, height: 1 }} />}
          isOpen={true}
          closePopover={onClose}
          anchorPosition="downLeft"
          panelPaddingSize="none"
          hasArrow={false}
        >
          <EuiContextMenu
            initialPanelId={0}
            panels={panels}
            data-test-subj="dashboardPanelContextMenu"
          />
        </EuiPopover>
      </div>
    </EuiPortal>
  );
};
