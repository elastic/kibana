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
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { useState } from 'react';
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
  /** Icon-only compact render (workflow-list popover). */
  preview?: boolean;
  /**
   * Raw step definition attached by `transformWorkflowToGraph`. Read by the
   * node to surface configuration the row UI cares about (e.g. retry-on-failure
   * `max-attempts` for the badge) without having to thread the workflow YAML
   * down a second time.
   */
  step?: {
    retry?: { 'max-attempts'?: number };
    'on-failure'?: { retry?: { 'max-attempts'?: number } };
  };
}

/**
 * Extract the configured `retry.max-attempts` for a step, looking at both
 * the step-level `retry` shortcut and the canonical `on-failure.retry` block.
 * Returns `undefined` when retry isn't configured.
 */
function getStepMaxAttempts(step: WorkflowGraphNodeData['step']): number | undefined {
  const fromDirect = step?.retry?.['max-attempts'];
  const fromOnFailure = step?.['on-failure']?.retry?.['max-attempts'];
  const value = fromDirect ?? fromOnFailure;
  return typeof value === 'number' && value > 0 ? value : undefined;
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
  const { stepType, label, isTrigger, stepExecution, matchesSearch, searchActive, preview, step } =
    node.data;
  const palette = getPalette(stepType, isTrigger);
  const dimmed = searchActive && !matchesSearch;
  const iconType = getNodeIcon(stepType);
  const maxAttempts = getStepMaxAttempts(step);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const { onStepRun, canRunSteps } = useWorkflowGraphActions();
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

  // Compact icon-only render for the workflow-list hover preview. All hooks
  // above are still called every render, so the early return is safe.
  if (preview) {
    return (
      <>
        {!isTrigger && <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />}
        <div
          aria-label={`${stepType}: ${label}`}
          css={{
            width: '100%',
            height: '100%',
            background: palette.iconAreaBg,
            border: `1px solid ${palette.outerBorder}`,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiIcon
            type={iconType}
            size="m"
            color={LOGO_ICONS.has(iconType) ? undefined : palette.iconColor}
          />
        </div>
        <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
      </>
    );
  }

  return (
    <>
      {!isTrigger && <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />}
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
          gap: 12,
          // 16px gutter on the right whenever any meta is present (retry badge,
          // status icon, or hover action) so the retry badge sits at the
          // design's 16px inset from the step's right edge.
          paddingRight:
            showActions || hasStatusIcon || maxAttempts != null ? 16 : 6,
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
              color={
                LOGO_ICONS.has(iconType)
                  ? undefined
                  : isSuccess
                  ? STATUS_SUCCESS
                  : isFailed
                  ? STATUS_FAIL
                  : palette.iconColor
              }
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
        {/* Retry-on-failure badge: the configured max-attempts taken from
            either `step.retry` or `step['on-failure'].retry`. Mirrors the
            badge in the execution detail step list. See Figma 10735:23813. */}
        {maxAttempts != null && (
          <EuiToolTip
            content={i18n.translate('workflowsUi.graphNode.retryBadgeTooltip', {
              defaultMessage:
                'Retries on failure up to {count, plural, one {# attempt} other {# attempts}}',
              values: { count: maxAttempts },
            })}
            disableScreenReaderOutput
          >
            <div
              data-test-subj="workflowGraphNodeRetryBadge"
              aria-label={i18n.translate('workflowsUi.graphNode.retryBadgeAria', {
                defaultMessage: '{count, plural, one {# retry} other {# retries}} on failure',
                values: { count: maxAttempts },
              })}
              css={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 2,
                paddingBottom: 2,
                borderRadius: 999,
                background: '#fce4e8',
                border: `1px solid rgba(189, 39, 30, 0.3)`,
                color: STATUS_FAIL,
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <EuiIcon type="refresh" size="s" color={STATUS_FAIL} aria-hidden />
              <span>{maxAttempts}</span>
            </div>
          </EuiToolTip>
        )}
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
            // selection / pane handlers in React Flow. The inner buttons own
            // keyboard activation; this wrapper is just a layout/grouping div.
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
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
        )}
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}
