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
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  transparentize,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { deslugifyStepName } from './deslugify_step_name';
import { errorHandleStyle } from './port_geometry';
import { resolveNodeChipStyle } from './resolve_node_chip_style';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import { getStepIconType } from '../step_icons';

interface ForeachGroupNodeData extends Record<string, unknown> {
  readonly label: string;
  /** The original step type (e.g. `'foreach'`, `'while'`). */
  readonly stepType: string;
  /** Optional execution status threaded through from the canvas. */
  readonly stepExecution?: WorkflowStepExecutionDto;
  /** True when the container body has at least one inner step (threaded from use_workflow_layout). */
  readonly hasBodySteps?: boolean;
}

function WorkflowGraphForeachGroupNodeInner(node: NodeProps<Node<ForeachGroupNodeData>>) {
  const { label, stepType, stepExecution, hasBodySteps } = node.data;
  const { euiTheme } = useEuiTheme();
  const actions = useWorkflowGraphActions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuClusterRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  // Close the popover on any pointerdown outside — React Flow's event handling
  // can swallow the outside-click that EuiPopover normally relies on.
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        closeMenu();
        return;
      }
      if (menuClusterRef.current?.contains(target)) return;
      if (target.closest('[data-test-subj="workflowGraphForeachGroupMenuPanel"]')) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isMenuOpen, closeMenu]);

  const handleAddFirstStep = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // Stop propagation so the click doesn't bubble into ReactFlow's onNodeClick,
      // which would select the foreach and open its edit panel instead of the insert menu.
      e.stopPropagation();
      if (!actions.edit) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      actions.edit.onInsert(
        { mode: 'branch', stepName: label, branch: { kind: 'steps' } },
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      );
    },
    [actions.edit, label]
  );

  const { colors } = euiTheme;
  // TODO: switch to xxs when available
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const displayLabel = deslugifyStepName(label);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const execStatus = stepExecution?.status;
  const isSuccess = execStatus === ExecutionStatus.COMPLETED;
  // CANCELLED stays neutral to match step-card behaviour (status_badge map).
  const isFailed =
    execStatus === ExecutionStatus.FAILED || execStatus === ExecutionStatus.TIMED_OUT;

  const chip = resolveNodeChipStyle(euiTheme, stepType, false, { isSuccess, isFailed });
  const panelBorder = isSuccess
    ? colors.success
    : isFailed
    ? colors.danger
    : colors.borderBasePlain;
  const borderRadius = euiTheme.border.radius.small;
  const iconType = getStepIconType(stepType);

  const menuLabel = i18n.translate('workflowsUi.foreachGroupNode.stepActions', {
    defaultMessage: 'Step actions',
  });

  const menuButton = (
    <EuiToolTip content={menuLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="boxesVertical"
        size="s"
        color="text"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((v) => !v)}
        data-test-subj="workflowGraphForeachGroupMenuButton"
      />
    </EuiToolTip>
  );

  return (
    <>
      <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />
      <div
        css={[
          {
            width: '100%',
            height: '100%',
            background: transparentize(colors.backgroundBasePlain, 0.5),
            border: `${euiTheme.border.width.thin} solid ${panelBorder}`,
            borderRadius,
            position: 'relative',
            transition: 'border-color 120ms ease',
          },
          nodeShadow,
        ]}
      >
        <div
          data-test-subj="workflowGraphForeachGroupHeader"
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontWeight: 500,
            color: colors.textHeading,
            lineHeight: '24px',
          }}
        >
          <div
            data-test-subj="workflowGraphForeachGroupChip"
            css={{
              flex: '0 0 auto',
              width: 28,
              height: 28,
              background: chip.background,
              border: `1px solid ${chip.border}`,
              borderRadius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            <EuiIcon type={iconType} size="m" color={chip.iconColor} aria-hidden />
          </div>
          <span
            css={{
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
            title={displayLabel}
          >
            {displayLabel}
          </span>
          {actions.edit && (
            <div
              ref={menuClusterRef}
              css={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              <EuiPopover
                isOpen={isMenuOpen}
                closePopover={closeMenu}
                panelPaddingSize="none"
                anchorPosition="downRight"
                aria-label={menuLabel}
                ownFocus
                panelProps={{ 'data-test-subj': 'workflowGraphForeachGroupMenuPanel' }}
                button={menuButton}
              >
                <EuiContextMenuPanel
                  items={[
                    <EuiContextMenuItem
                      key="edit"
                      icon="pencil"
                      onClick={() => {
                        closeMenu();
                        actions.edit?.onEditStep(node.id);
                      }}
                      data-test-subj="workflowGraphForeachGroupMenuEdit"
                    >
                      {i18n.translate('workflowsUi.foreachGroupNode.editStep', {
                        defaultMessage: 'Edit step',
                      })}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="delete"
                      icon="trash"
                      css={{ color: euiTheme.colors.textDanger }}
                      onClick={() => {
                        closeMenu();
                        actions.edit?.onDeleteNode(node.id);
                      }}
                      data-test-subj="workflowGraphForeachGroupMenuDelete"
                    >
                      {i18n.translate('workflowsUi.foreachGroupNode.deleteStep', {
                        defaultMessage: 'Delete step',
                      })}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </div>
          )}
        </div>
        {!hasBodySteps && (
          <div
            css={{
              margin: `0 ${euiTheme.size.m} ${euiTheme.size.m}`,
              borderRadius: euiTheme.border.radius.small,
              border: `1px dashed ${euiTheme.colors.borderBaseSubdued}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
            }}
          >
            {actions.edit && (
              <EuiButtonIcon
                iconType="plusCircle"
                aria-label={i18n.translate('workflowsUi.foreachGroupNode.addFirstStep', {
                  defaultMessage: 'Add first step in {label}',
                  values: { label: displayLabel },
                })}
                onClick={handleAddFirstStep}
                size="m"
                color="text"
                css={{ opacity: 0.5 }}
                data-test-subj="workflowGraphForeachGroupAddFirstStep"
              />
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
      {/* Fallback handle — mirrors workflow_graph_node.tsx. Required so failure edges
          sourced from a foreach/while container can resolve the 'fallback' sourceHandle. */}
      <Handle
        type="source"
        id="fallback"
        position={Position.Bottom}
        style={{ opacity: 0, ...errorHandleStyle() }}
      />
    </>
  );
}

export const WorkflowGraphForeachGroupNode = memo(WorkflowGraphForeachGroupNodeInner);
