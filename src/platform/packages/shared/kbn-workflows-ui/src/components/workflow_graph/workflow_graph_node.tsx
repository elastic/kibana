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

function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const { stepType, label, isTrigger, stepExecution, preview, step } = node.data;
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const isTriggerNode = isTrigger || TRIGGER_STEP_TYPES.has(stepType);

  // Node card colors, sourced from Borealis semantic tokens so they adapt to
  // light/dark automatically. Each token is the closest match to the design;
  // the trailing comment shows the light-mode hex each token resolves to (or
  // approximates).
  const { colors } = euiTheme;
  // Card outer border + icon pane are tinted to the node's family:
  // step = light blue, trigger = light pink.
  const STEP_OUTER_BORDER = colors.backgroundLightPrimary; // #d8e6ff
  const STEP_ICON_AREA_BG = colors.backgroundLightPrimary; // ~#e3edff
  const STEP_INNER_BOX_BORDER = colors.borderBaseSubdued; // ~#e4e7f1
  const STEP_ICON_COLOR = colors.primary; // ~#61a2ff (light primary #0b64dd)
  const STEP_LABEL_COLOR = colors.textHeading; // #111c2c
  const RUNNING_BORDER = colors.primary; // ~#bfdbff
  const SUCCESS_BG = colors.backgroundBaseSuccess; // ~#d0f3f2
  const SUCCESS_COLOR = colors.success; // ~#16c5c0
  const TRIGGER_OUTER_BORDER = colors.backgroundLightAccent; // #ffdbe8
  const TRIGGER_ICON_AREA_BG = colors.backgroundBaseAccent; // ~#fff3f9
  const TRIGGER_INNER_BOX_BORDER = colors.borderBaseAccent; // #ffc7db
  const TRIGGER_ICON_COLOR = colors.accent; // ~#ee72a6 (light accent #bc1e70)
  const STEP_SELECTED_BORDER = colors.primary; // ~#a3c4ff
  const TRIGGER_SELECTED_BORDER = colors.accent; // ~#ffddea

  // Theme-derived palettes — adapt to dark/light mode automatically.
  const palette = isTriggerNode
    ? {
        outerBorder: TRIGGER_OUTER_BORDER,
        iconAreaBg: TRIGGER_ICON_AREA_BG,
        innerBoxBorder: TRIGGER_INNER_BOX_BORDER,
        iconColor: TRIGGER_ICON_COLOR,
        selectedBorder: TRIGGER_SELECTED_BORDER,
      }
    : {
        outerBorder: STEP_OUTER_BORDER,
        iconAreaBg: STEP_ICON_AREA_BG,
        innerBoxBorder: STEP_INNER_BOX_BORDER,
        iconColor: STEP_ICON_COLOR,
        selectedBorder: STEP_SELECTED_BORDER,
      };

  const statusSuccessColor = SUCCESS_COLOR;
  const statusSuccessBg = SUCCESS_BG;
  const statusFailColor = euiTheme.colors.danger;
  const statusFailBg = euiTheme.colors.backgroundBaseDanger;

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
  // Outer border: a successfully-run step keeps the
  // DEFAULT gray outer border — the status reads from the icon area /
  // inner box / icon. Only when the row is selected does the border take
  // on the status colour. Running is its own state and always shows the
  // Working border (`#bfdbff`) since that's how the in-progress signal is
  // expressed in the design system.
  const borderColor = isActive
    ? isFailed
      ? statusFailColor
      : isSuccess
      ? statusSuccessColor
      : isRunning
      ? RUNNING_BORDER
      : palette.selectedBorder
    : isRunning
    ? RUNNING_BORDER
    : palette.outerBorder;
  const iconAreaBg = isSuccess ? statusSuccessBg : isFailed ? statusFailBg : palette.iconAreaBg;
  // Inner box border keeps its default neutral colour when only selection
  // is active (the selected state leaves the inner box border at #e4e7f1);
  // run states still recolour it as before.
  const innerBoxBorder = isSuccess
    ? statusSuccessColor
    : isFailed
    ? statusFailColor
    : palette.innerBoxBorder;
  // Retry badge — Warning variant
  const RETRY_BADGE_BG = colors.backgroundBaseWarning; // ~#fde9b5
  const RETRY_BADGE_COLOR = colors.textWarning; // #825803

  // 10px for static/executed, 8px for working/running
  const borderRadius = isRunning ? 8 : 10;
  const hasStatusIcon = isRunning || isSuccess || isFailed;
  // Hover actions hide when an execution-status icon is visible so they
  // don't overlap. They still show on hover/select when there's no status.
  const showActions = (isHovered || isActive) && !isTrigger && !hasStatusIcon;
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
            <div
              css={[
                { color: palette.iconColor, display: 'flex' },
                isTriggerNode && {
                  '& svg, & svg *': { fill: TRIGGER_ICON_COLOR },
                },
              ]}
            >
              {renderStepIcon({
                stepType,
                isTrigger: isTrigger ?? false,
                size: 'm',
                color: palette.iconColor,
              })}
            </div>
          ) : (
            <EuiIcon
              type={iconType}
              size="m"
              color={
                isTriggerNode
                  ? TRIGGER_ICON_COLOR
                  : LOGO_ICONS.has(iconType)
                  ? undefined
                  : palette.iconColor
              }
              aria-hidden={true}
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
        css={[
          {
            position: 'relative',
            width: '100%',
            height: '100%',
            background: euiTheme.colors.backgroundBasePlain,
            // Flat card: a 1px border tinted to the node's
            // family (light blue for steps, light pink for triggers) via
            // `palette.outerBorder`. Active/running/status states recolor it.
            border: `1px solid ${borderColor}`,
            borderRadius,
            // Clip children to the card's rounded shape so the icon pane's
            // corners stay concentric with the card border (otherwise the pane
            // and card render two slightly different corner arcs).
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            // 16px gutter on the right whenever any meta is present (retry badge,
            // status icon, or hover action) so the retry badge sits at the
            // design's 16px inset from the step's right edge.
            paddingRight: 16,
            transition: 'border-color 120ms ease, background 120ms ease',
          },
        ]}
      >
        {/* Icon area — colored background pane. No own corner radius: the card's
            `overflow: hidden` clips it to the rounded shape, so the pane fills
            flush into the corner with no gap. */}
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
            {(() => {
              // Trigger icon stays in its "Datavis Default Color 4" pink ONLY
              // while the workflow hasn't run yet. Once execution kicks off,
              // the trigger picks up the same success/failed colours as the
              // regular step rows — so a successful run paints the trigger
              // turquoise alongside the rest of the graph.
              const iconColor = isSuccess
                ? statusSuccessColor
                : isFailed
                ? statusFailColor
                : isTriggerNode
                ? TRIGGER_ICON_COLOR
                : palette.iconColor;
              // Triggers in their idle pink state need a hard `fill` override
              // because EuiIcon paints `fill` directly onto the SVG paths,
              // beating CSS `color` inheritance.
              const forceTriggerPinkFill = isTriggerNode && !isSuccess && !isFailed;
              if (renderStepIcon) {
                return (
                  <div
                    css={[
                      { color: iconColor, display: 'flex' },
                      forceTriggerPinkFill && {
                        '& svg, & svg *': { fill: TRIGGER_ICON_COLOR },
                      },
                    ]}
                  >
                    {renderStepIcon({
                      stepType,
                      isTrigger: isTrigger ?? false,
                      size: 'm',
                      color: iconColor,
                    })}
                  </div>
                );
              }
              return (
                <EuiIcon
                  type={iconType}
                  size="m"
                  color={LOGO_ICONS.has(iconType) ? undefined : iconColor}
                  aria-hidden={true}
                />
              );
            })()}
          </div>
        </div>

        <span
          css={{
            flex: '1 1 auto',
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '24px',
            color: STEP_LABEL_COLOR,
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
            badge in the execution detail step list. */}
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
                gap: 2,
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 4,
                paddingBottom: 4,
                borderRadius: 999,
                background: RETRY_BADGE_BG,
                color: RETRY_BADGE_COLOR,
                fontFamily: euiTheme.font.family,
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <EuiIcon type="refresh" size="s" color={RETRY_BADGE_COLOR} aria-hidden />
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
              <EuiIcon
                type="checkInCircleFilled"
                color={statusSuccessColor}
                size="m"
                aria-hidden={true}
              />
            ) : (
              <EuiIcon type="errorFill" color={statusFailColor} size="m" aria-hidden={true} />
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

/**
 * Field-level equality comparator so that a live-execution status poll that
 * mints a fresh `data` object identity only re-renders nodes whose status
 * actually changed — not every node in the graph on every poll.
 *
 * Mirrors the pattern used by `edgePropsAreEqual` in workflow_graph_edge.tsx.
 */
function nodePropsAreEqual(
  prev: NodeProps<Node<WorkflowGraphNodeData>>,
  next: NodeProps<Node<WorkflowGraphNodeData>>
): boolean {
  return (
    prev.data.label === next.data.label &&
    prev.data.stepType === next.data.stepType &&
    prev.data.isTrigger === next.data.isTrigger &&
    prev.data.stepExecution?.status === next.data.stepExecution?.status &&
    prev.data.preview === next.data.preview &&
    prev.data.step === next.data.step &&
    prev.selected === next.selected &&
    prev.targetPosition === next.targetPosition &&
    prev.sourcePosition === next.sourcePosition &&
    prev.positionAbsoluteX === next.positionAbsoluteX &&
    prev.positionAbsoluteY === next.positionAbsoluteY
  );
}

export const WorkflowGraphNode = memo(WorkflowGraphNodeInner, nodePropsAreEqual);
