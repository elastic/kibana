/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiIcon, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, TRIGGER_STEP_TYPES } from '@kbn/workflows';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';

export interface WorkflowGraphNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly stepType: string;
  readonly isTrigger?: boolean;
  readonly stepExecution?: WorkflowStepExecutionDto;
  readonly matchesSearch?: boolean;
  readonly searchActive?: boolean;
  /** Icon-only compact render (workflow-list popover). */
  readonly preview?: boolean;
  /**
   * Raw step definition attached by `transformWorkflowToGraph`. Read by the
   * node to surface configuration the row UI cares about (e.g. retry-on-failure
   * `max-attempts` for the badge) without having to thread the workflow YAML
   * down a second time.
   */
  readonly step?: {
    readonly retry?: { readonly 'max-attempts'?: number };
    readonly 'on-failure'?: { readonly retry?: { readonly 'max-attempts'?: number } };
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

// Branded multi-color icons keep their natural palette; everything else is
// tinted with the trigger/step accent color.
const LOGO_ICONS = new Set(['logoElasticsearch', 'logoKibana']);

// Figma drop-shadow tokens — three layers each.
// rgba(43, 57, 79, ...) is the Elastic ink color; kept as-is because EUI
// does not expose a CSS-shadow token that adapts to dark mode.
const NODE_SHADOW_SMALL =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 2px 7px 0 rgba(43, 57, 79, 0.08), 0 4px 11px 0 rgba(43, 57, 79, 0.05)';
const NODE_SHADOW_MEDIUM =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 3px 10px 0 rgba(43, 57, 79, 0.10), 0 6px 14px 0 rgba(43, 57, 79, 0.06)';
const NODE_SHADOW_LARGE =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 4px 13px 0 rgba(43, 57, 79, 0.12), 0 8px 17px 0 rgba(43, 57, 79, 0.07)';

function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const { stepType, label, isTrigger, stepExecution, matchesSearch, searchActive, preview, step } =
    node.data;
  const { euiTheme } = useEuiTheme();
  const isTriggerNode = isTrigger || TRIGGER_STEP_TYPES.has(stepType);

  // Theme-derived palettes — adapt to dark/light mode automatically.
  const palette = isTriggerNode
    ? {
        outerBorder: euiTheme.colors.borderBaseAccent,
        iconAreaBg: euiTheme.colors.backgroundBaseAccent,
        innerBoxBorder: euiTheme.colors.borderBaseAccent,
        iconColor: euiTheme.colors.accent,
        activeBorder: euiTheme.colors.accent,
        activeIconAreaBg: euiTheme.colors.borderBaseAccent,
      }
    : {
        outerBorder: euiTheme.colors.borderBaseAccentSecondary,
        iconAreaBg: euiTheme.colors.backgroundLightAccentSecondary,
        innerBoxBorder: euiTheme.colors.borderBaseFloating,
        iconColor: euiTheme.colors.accentSecondary,
        activeBorder: euiTheme.colors.accentSecondary,
        activeIconAreaBg: euiTheme.colors.borderBaseAccentSecondary,
      };

  const statusSuccessColor = euiTheme.colors.vis.euiColorVisSuccess0;
  const statusSuccessBg = euiTheme.colors.backgroundBaseSuccess;
  const statusFailColor = euiTheme.colors.danger;
  const statusFailBg = euiTheme.colors.backgroundBaseDanger;

  const dimmed = searchActive && !matchesSearch;
  const iconType = getNodeIcon(stepType);
  const maxAttempts = getStepMaxAttempts(step);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const { onStepRun, canRunSteps, renderStepIcon, onStepSelect } = useWorkflowGraphActions();
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
    ? statusSuccessColor
    : isFailed
    ? statusFailColor
    : palette.outerBorder;
  const iconAreaBg = isActive
    ? palette.activeIconAreaBg
    : isSuccess
    ? statusSuccessBg
    : isFailed
    ? statusFailBg
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
          {renderStepIcon ? (
            <div css={{ color: palette.iconColor, display: 'flex' }}>
              {renderStepIcon({ stepType, isTrigger: isTrigger ?? false, size: 'm' })}
            </div>
          ) : (
            <EuiIcon
              type={iconType}
              size="m"
              color={LOGO_ICONS.has(iconType) ? undefined : palette.iconColor}
            />
          )}
        </div>
        <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
      </>
    );
  }

  return (
    <>
      {!isTrigger && <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${stepType} step: ${label}${
          stepExecution?.status ? `, status: ${stepExecution.status}` : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onStepSelect?.(node.id);
          }
        }}
        css={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: euiTheme.colors.backgroundBasePlain,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          // 16px gutter on the right whenever any meta is present (retry badge,
          // status icon, or hover action) so the retry badge sits at the
          // design's 16px inset from the step's right edge.
          paddingRight: showActions || hasStatusIcon || maxAttempts != null ? 16 : 6,
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
              background: euiTheme.colors.backgroundBasePlain,
              border: `1px solid ${innerBoxBorder}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 120ms ease',
            }}
          >
            {renderStepIcon ? (
              <div
                css={{
                  color: isSuccess
                    ? statusSuccessColor
                    : isFailed
                    ? statusFailColor
                    : palette.iconColor,
                  display: 'flex',
                }}
              >
                {renderStepIcon({ stepType, isTrigger: isTrigger ?? false, size: 'm' })}
              </div>
            ) : (
              <EuiIcon
                type={iconType}
                size="m"
                color={
                  LOGO_ICONS.has(iconType)
                    ? undefined
                    : isSuccess
                    ? statusSuccessColor
                    : isFailed
                    ? statusFailColor
                    : palette.iconColor
                }
              />
            )}
          </div>
        </div>

        <span
          css={{
            flex: '1 1 auto',
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '24px',
            color: euiTheme.colors.textParagraph,
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
                background: statusFailBg,
                border: `1px solid ${euiTheme.colors.borderBaseDanger}`,
                color: statusFailColor,
                fontFamily: euiTheme.font.family,
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <EuiIcon type="refresh" size="s" color={statusFailColor} aria-hidden />
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
              <EuiIcon type="checkInCircleFilled" color={statusSuccessColor} size="m" />
            ) : (
              <EuiIcon type="errorFill" color={statusFailColor} size="m" />
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

export const WorkflowGraphNode = memo(WorkflowGraphNodeInner);
