/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { useCloseOnOutsidePointerDown } from './use_close_on_outside_pointer_down';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';

/** Node kind drives the destructive menu label and which actions apply. */
export type NodeKind = 'trigger' | 'step' | 'fallback';

/** Closed, or open from the ⋯ button / a right-click at viewport coords. */
export type NodeMenuState =
  | { readonly open: false }
  | { readonly open: true; readonly at?: { readonly x: number; readonly y: number } };

/**
 * `EuiPopover` derives its panel z-index from the anchor's ancestors (+2000), so
 * this deliberately exceeds `euiTheme.levels.modal` / `toast` to keep the
 * right-click menu above flyouts and modals; `levels.menu` (2000) would not.
 */
const NODE_CONTEXT_MENU_Z_INDEX = 10000;

const NODE_MENU_INSIDE_TEST_SUBJS = [
  'workflowGraphNodeMenuPanel',
  'workflowGraphNodeContextMenuAnchor',
] as const;

/** Edit / Delete context-menu panel shared by step nodes and container groups. */
export function StepContextMenuPanel({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  editTestSubj,
  deleteTestSubj,
}: {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  editTestSubj: string;
  deleteTestSubj: string;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiContextMenuPanel
      items={[
        <EuiContextMenuItem key="edit" icon="pencil" onClick={onEdit} data-test-subj={editTestSubj}>
          {editLabel}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="delete"
          icon="trash"
          css={{ color: euiTheme.colors.textDanger }}
          onClick={onDelete}
          data-test-subj={deleteTestSubj}
        >
          {deleteLabel}
        </EuiContextMenuItem>,
      ]}
    />
  );
}

export function NodeRunActions({
  onStepRun,
  canRunSteps,
  label,
}: {
  onStepRun?: (label: string) => void;
  canRunSteps?: boolean;
  label: string;
}) {
  const runLabel = i18n.translate('workflowsUi.graphNode.testThisStep', {
    defaultMessage: 'Test this step',
  });
  return (
    <div
      css={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <EuiToolTip content={runLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="play"
          size="s"
          color="success"
          aria-label={runLabel}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onStepRun?.(label);
          }}
          isDisabled={!onStepRun || canRunSteps === false}
          data-test-subj="workflowGraphNodeRunStep"
        />
      </EuiToolTip>
    </div>
  );
}

/**
 * Right-aligned node control: ⋯ opens the step context menu.
 * Right-click passes `at` so the same menu opens under the cursor.
 */
export function NodeActionCluster({
  nodeId,
  kind,
  edit,
  menu,
  onMenuChange,
}: {
  nodeId: string;
  kind: NodeKind;
  edit: WorkflowGraphEditActions;
  menu: NodeMenuState;
  onMenuChange: (next: NodeMenuState) => void;
}) {
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const isMenuOpen = menu.open;
  const cursorAt = menu.open ? menu.at : undefined;
  const closeMenu = useCallback(() => onMenuChange({ open: false }), [onMenuChange]);

  useCloseOnOutsidePointerDown(isMenuOpen, closeMenu, clusterRef, NODE_MENU_INSIDE_TEST_SUBJS);

  const menuLabel = i18n.translate('workflowsUi.graphNode.stepActions', {
    defaultMessage: 'Step actions',
  });
  const deleteLabel =
    kind === 'trigger'
      ? i18n.translate('workflowsUi.graphNode.deleteTrigger', { defaultMessage: 'Delete trigger' })
      : kind === 'fallback'
      ? i18n.translate('workflowsUi.graphNode.removeErrorRoute', {
          defaultMessage: 'Remove error route',
        })
      : i18n.translate('workflowsUi.graphNode.deleteStep', { defaultMessage: 'Delete step' });

  const run = (fn: () => void) => () => {
    closeMenu();
    fn();
  };

  const menuPanel = (
    <StepContextMenuPanel
      editLabel={i18n.translate('workflowsUi.graphNode.editStep', {
        defaultMessage: 'Edit step',
      })}
      deleteLabel={deleteLabel}
      onEdit={run(() => edit.onEditStep(nodeId))}
      onDelete={run(() => edit.onDeleteNode(nodeId))}
      editTestSubj="workflowGraphNodeMenuEdit"
      deleteTestSubj="workflowGraphNodeMenuDelete"
    />
  );

  const ellipsisButton = (
    <EuiToolTip content={menuLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="boxesVertical"
        size="s"
        color="text"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => onMenuChange(isMenuOpen ? { open: false } : { open: true })}
        data-test-subj="workflowGraphNodeMenuButton"
      />
    </EuiToolTip>
  );

  return (
    <div
      ref={clusterRef}
      css={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
      data-test-subj="workflowGraphNodeActionCluster"
    >
      {cursorAt
        ? createPortal(
            <div
              data-test-subj="workflowGraphNodeContextMenuAnchor"
              css={{
                position: 'fixed',
                left: cursorAt.x,
                top: cursorAt.y,
                width: 0,
                height: 0,
                zIndex: NODE_CONTEXT_MENU_Z_INDEX,
              }}
            >
              <EuiPopover
                isOpen
                closePopover={closeMenu}
                panelPaddingSize="none"
                anchorPosition="downLeft"
                aria-label={menuLabel}
                ownFocus
                panelProps={{ 'data-test-subj': 'workflowGraphNodeMenuPanel' }}
                button={<span />}
              >
                {menuPanel}
              </EuiPopover>
            </div>,
            document.body
          )
        : null}
      {/* Keep the ⋯ control in-tree; when right-click is open it is visual-only
          (panel is portaled at the cursor). Button click still toggles the
          button-anchored popover when there is no cursor anchor. */}
      {cursorAt ? (
        ellipsisButton
      ) : (
        <EuiPopover
          isOpen={isMenuOpen}
          closePopover={closeMenu}
          panelPaddingSize="none"
          anchorPosition="downRight"
          aria-label={menuLabel}
          ownFocus
          panelProps={{ 'data-test-subj': 'workflowGraphNodeMenuPanel' }}
          button={ellipsisButton}
        >
          {menuPanel}
        </EuiPopover>
      )}
    </div>
  );
}
