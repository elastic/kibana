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
  EuiContextMenuPanel,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, TRIGGER_STEP_TYPES } from '@kbn/workflows';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';

export interface WorkflowGraphNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  isTrigger?: boolean;
  stepExecution?: WorkflowStepExecutionDto;
  matchesSearch?: boolean;
  searchActive?: boolean;
}

const STEP_TYPE_ICON: Record<string, string> = {
  if: 'branch',
  foreach: 'refresh',
  parallel: 'visGoal',
  merge: 'merge',
  atomic: 'package',
  manual: 'bolt',
  alert: 'bell',
  scheduled: 'clock',
  wait: 'clock',
  http: 'globe',
  elasticsearch: 'logoElasticsearch',
  kibana: 'logoKibana',
};

function getNodeIcon(stepType: string): string {
  const base = stepType.split('.')[0];
  return STEP_TYPE_ICON[base] ?? 'package';
}

// Figma palette — kept as literals because these are design tokens for this
// component specifically (datavis pink/blue families), not theme-level.
const TRIGGER_PALETTE = {
  outerBorder: '#ffc7db',
  iconAreaBg: '#fff3f9',
  innerBoxBorder: '#ffc7db',
  iconColor: '#bd271e',
  activeBorder: '#ee5e84',
  activeIconAreaBg: '#ffc7db',
} as const;
const STEP_PALETTE = {
  outerBorder: '#bfdbff',
  iconAreaBg: '#f1f6ff',
  innerBoxBorder: '#e4e7f1',
  iconColor: '#006bb8',
  activeBorder: '#61a2ff',
  activeIconAreaBg: '#bfdbff',
} as const;

// Branded multi-color icons keep their natural palette; everything else is
// tinted with the trigger/step accent color.
const LOGO_ICONS = new Set(['logoElasticsearch', 'logoKibana']);

// Figma drop-shadow tokens — three layers each.
const NODE_SHADOW_SMALL =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 2px 7px 0 rgba(43, 57, 79, 0.08), 0 4px 11px 0 rgba(43, 57, 79, 0.05)';
const NODE_SHADOW_MEDIUM =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 3px 10px 0 rgba(43, 57, 79, 0.10), 0 6px 14px 0 rgba(43, 57, 79, 0.06)';
const NODE_SHADOW_LARGE =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 4px 13px 0 rgba(43, 57, 79, 0.12), 0 8px 17px 0 rgba(43, 57, 79, 0.07)';

// Execution-status accents (Figma vis-color tokens).
const STATUS_SUCCESS = '#16c5c0';
const STATUS_SUCCESS_ICON_BG = '#d0f3f2';
const STATUS_FAIL = '#bd271e';
const STATUS_FAIL_ICON_BG = '#fce4e8';

function getPalette(stepType: string, isTrigger: boolean | undefined) {
  if (isTrigger || TRIGGER_STEP_TYPES.has(stepType)) return TRIGGER_PALETTE;
  return STEP_PALETTE;
}

export function WorkflowGraphNode(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const { stepType, label, isTrigger, stepExecution, matchesSearch, searchActive } = node.data;
  const palette = getPalette(stepType, isTrigger);
  const dimmed = searchActive && !matchesSearch;
  const iconType = getNodeIcon(stepType);
  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const { onStepRun, canRunSteps, onOpenStepMenu, renderStepMenuItems } =
    useWorkflowGraphActions();
  const execStatus = stepExecution?.status;
  const isRunning =
    execStatus === ExecutionStatus.RUNNING ||
    execStatus === ExecutionStatus.WAITING ||
    execStatus === ExecutionStatus.WAITING_FOR_INPUT ||
    execStatus === ExecutionStatus.PENDING;
  const isSuccess = execStatus === ExecutionStatus.COMPLETED;
  const isFailed =
    execStatus === ExecutionStatus.FAILED ||
    execStatus === ExecutionStatus.TIMED_OUT ||
    execStatus === ExecutionStatus.CANCELLED;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const openMenu = useCallback(() => {
    onOpenStepMenu?.(label);
    setIsMenuOpen(true);
  }, [onOpenStepMenu, label]);
  const borderColor = isActive
    ? palette.activeBorder
    : isSuccess
    ? STATUS_SUCCESS
    : isFailed
    ? STATUS_FAIL
    : palette.outerBorder;
  const iconAreaBg = isActive
    ? palette.activeIconAreaBg
    : isSuccess
    ? STATUS_SUCCESS_ICON_BG
    : isFailed
    ? STATUS_FAIL_ICON_BG
    : palette.iconAreaBg;
  const innerBoxBorder = isActive ? 'transparent' : palette.innerBoxBorder;
  const hasStatusIcon = isRunning || isSuccess || isFailed;
  // Hover actions hide when an execution-status icon is visible so they
  // don't overlap. They still show on hover/select when there's no status.
  const showActions = (isHovered || isActive) && !isTrigger && !hasStatusIcon;
  // Use the medium shadow for in-flight / executed steps to lift them
  // slightly from the canvas (matches the Figma running/success spec).
  const shadow = isActive
    ? NODE_SHADOW_LARGE
    : hasStatusIcon
    ? NODE_SHADOW_MEDIUM
    : NODE_SHADOW_SMALL;
  const runLabel = i18n.translate('workflowsUi.graphNode.runStep', { defaultMessage: 'Run step' });
  const moreLabel = i18n.translate('workflowsUi.graphNode.moreActions', {
    defaultMessage: 'More actions',
  });

  return (
    <>
      {!isTrigger && <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />}
      <div
        aria-label={`${stepType} step: ${label}${
          stepExecution?.status ? `, status: ${stepExecution.status}` : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        css={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#ffffff',
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          paddingRight: showActions || hasStatusIcon ? 16 : 6,
          gap: 12,
          boxShadow: shadow,
          opacity: dimmed ? 0.4 : 1,
          transition:
            'opacity 120ms ease, border-color 120ms ease, box-shadow 120ms ease, background 120ms ease',
          '&:hover': isActive
            ? undefined
            : {
                boxShadow: NODE_SHADOW_MEDIUM,
              },
        }}
      >
        {/* Icon area — colored background pane */}
        <div
          css={{
            flex: '0 0 auto',
            height: '100%',
            background: iconAreaBg,
            display: 'flex',
            alignItems: 'center',
            padding: 12,
            transition: 'background 120ms ease',
          }}
        >
          <div
            css={{
              width: 40,
              height: 40,
              background: '#ffffff',
              border: `1px solid ${innerBoxBorder}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 120ms ease',
            }}
          >
            <EuiIcon
              type={iconType}
              size="m"
              color={LOGO_ICONS.has(iconType) ? undefined : palette.iconColor}
            />
          </div>
        </div>

        <span
          css={{
            flex: '1 1 auto',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '24px',
            color: '#111c2c',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
          title={label}
        >
          {label}
        </span>
        {hasStatusIcon && (
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 16,
              height: 16,
            }}
            aria-label={
              isRunning
                ? i18n.translate('workflowsUi.graphNode.statusRunning', {
                    defaultMessage: 'Running',
                  })
                : isSuccess
                ? i18n.translate('workflowsUi.graphNode.statusSuccess', {
                    defaultMessage: 'Completed successfully',
                  })
                : i18n.translate('workflowsUi.graphNode.statusFailed', {
                    defaultMessage: 'Failed',
                  })
            }
          >
            {isRunning ? (
              <EuiLoadingSpinner size="m" />
            ) : isSuccess ? (
              <EuiIcon type="checkInCircleFilled" color={STATUS_SUCCESS} size="m" />
            ) : (
              <EuiIcon type="errorFill" color={STATUS_FAIL} size="m" />
            )}
          </div>
        )}
        {showActions && (
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 4,
            }}
            // Stop clicks/mousedowns on the icons from bubbling to the node
            // selection / pane handlers in React Flow.
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <EuiToolTip content={runLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="play"
                size="s"
                color="success"
                aria-label={runLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  onStepRun?.(label);
                }}
                isDisabled={!onStepRun || canRunSteps === false}
                data-test-subj="workflowGraphNodeRunStep"
              />
            </EuiToolTip>
            <EuiPopover
              isOpen={isMenuOpen}
              closePopover={closeMenu}
              panelPaddingSize="none"
              anchorPosition="downRight"
              button={
                <EuiToolTip content={moreLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    size="s"
                    color="text"
                    aria-label={moreLabel}
                    onClick={(e) => {
                      e.stopPropagation();
                      isMenuOpen ? closeMenu() : openMenu();
                    }}
                    isDisabled={!renderStepMenuItems}
                    data-test-subj="workflowGraphNodeMore"
                  />
                </EuiToolTip>
              }
            >
              {renderStepMenuItems && (
                <EuiContextMenuPanel
                  items={React.Children.toArray(renderStepMenuItems(closeMenu)) as JSX.Element[]}
                />
              )}
            </EuiPopover>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}
