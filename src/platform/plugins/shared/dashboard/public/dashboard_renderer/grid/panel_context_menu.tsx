/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiPortal, EuiPopover } from '@elastic/eui';
import type { SelectedPanelsLayoutMode } from '../../dashboard_api/layout_manager/apply_selected_panels_layout';
import {
  dashboardClonePanelActionStrings,
  dashboardCopyToDashboardActionStrings,
  dashboardPanelContextMenuStrings,
} from '../../dashboard_actions/_dashboard_actions_strings';
import { useBulkPanelActions } from './use_bulk_panel_actions';

export interface PanelContextMenuContextValue {
  openContextMenu: (panelId: string, position: { x: number; y: number }) => void;
}

export const PanelContextMenuContext = React.createContext<PanelContextMenuContextValue | null>(
  null
);

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
  const effectivePanelIds = useMemo(() => {
    if (!panelId) return new Set<string>();
    return selectedPanelIds.has(panelId) ? selectedPanelIds : new Set([panelId]);
  }, [panelId, selectedPanelIds]);

  const { duplicate, remove, group, canGroup, applyLayout, copyToDashboard, canCopyToDashboard } =
    useBulkPanelActions(effectivePanelIds);

  const handleDuplicate = useCallback(async () => {
    try {
      await duplicate();
    } finally {
      onClose();
    }
  }, [duplicate, onClose]);

  const handleRemove = useCallback(() => {
    remove();
    onClose();
  }, [remove, onClose]);

  const handleGroup = useCallback(() => {
    group();
    onClose();
  }, [group, onClose]);

  const handleLayoutSubAction = useCallback(
    (which: SelectedPanelsLayoutMode) => {
      applyLayout(which);
      onClose();
    },
    [applyLayout, onClose]
  );

  const handleCopyToDashboard = useCallback(() => {
    onClose();
    copyToDashboard();
  }, [copyToDashboard, onClose]);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
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
                  icon: 'addToDashboard' as const,
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
            icon: 'alignRight',
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
    canGroup,
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
          aria-label={dashboardPanelContextMenuStrings.getContextMenuAriaLabel()}
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
