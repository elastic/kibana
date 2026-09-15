/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { EuiButtonIcon, EuiIcon, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, TRIGGER_STEP_TYPES } from '@kbn/workflows';
import { deslugifyStepName } from './deslugify_step_name';
import { getStepChipPalette } from './step_chip_palette';
import type { ChipOutcome } from './step_chip_palette';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import type { RenderStepIcon } from './workflow_graph_actions_context';
import { getStepFamily, getStepIconType, getTriggerTypeIconType } from '../step_icons';
import type { StepFamily } from '../step_icons';

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

// Branded multi-color icons keep their natural palette while idle. This set
// guards only the EuiIcon `color` prop on the fallback render path — force-fill
// on outcome still reaches these icons via the CSS override.
const LOGO_ICONS = new Set<IconType>(['logoElasticsearch', 'logoKibana']);

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

// ----------- Pure color/state helpers -----------

interface ExecutionState {
  readonly isRunning: boolean;
  readonly isSuccess: boolean;
  readonly isFailed: boolean;
}

/**
 * Maps the full ExecutionStatus enum to the three visual buckets used by the
 * graph canvas:
 *
 * - isRunning  → spinner only; card and chip colours unchanged
 * - isSuccess  → green border + green chip + checkCircleFill
 * - isFailed   → red border + red chip + errorFill
 * - none of the above → fully neutral (QUEUED, SKIPPED, CANCELLED, no record)
 *
 * CANCELLED is intentionally neutral — it aligns with the plugin's canonical
 * status_badge map (subdued/grey) and honours "colour only on effective
 * execution". WAITING_FOR_CHILD gains a spinner it was missing (a foreach
 * waiting on children is executing).
 */
function resolveExecutionState(execStatus: ExecutionStatus | undefined): ExecutionState {
  const isRunning =
    execStatus === ExecutionStatus.RUNNING ||
    execStatus === ExecutionStatus.PENDING ||
    execStatus === ExecutionStatus.WAITING ||
    execStatus === ExecutionStatus.WAITING_FOR_INPUT ||
    execStatus === ExecutionStatus.WAITING_FOR_CHILD;
  const isSuccess = execStatus === ExecutionStatus.COMPLETED;
  const isFailed =
    execStatus === ExecutionStatus.FAILED || execStatus === ExecutionStatus.TIMED_OUT;
  return { isRunning, isSuccess, isFailed };
}

/** Derives the ChipOutcome from execution state for the palette helper. */
function toChipOutcome({ isSuccess, isFailed }: ExecutionState): ChipOutcome {
  if (isSuccess) return 'success';
  if (isFailed) return 'failure';
  return 'none';
}

interface NodeColors {
  readonly chip: ReturnType<typeof getStepChipPalette>;
  readonly stepLabelColor: string;
  readonly cardBorderColor: string;
  readonly retryBadgeBg: string;
  readonly retryBadgeBorderColor: string;
  readonly retryBadgeColor: string;
  readonly statusSuccessColor: string;
  readonly statusFailColor: string;
  readonly hasStatusIcon: boolean;
  /** True when the icon must be force-filled to override a rich-colour logo. */
  readonly forceFill: boolean;
}

export function resolveNodeColors(
  euiTheme: EuiTheme,
  family: StepFamily,
  { isRunning, isSuccess, isFailed }: ExecutionState
): NodeColors {
  const { colors } = euiTheme;

  // Card border: execution status only — no selection gate.
  // A node with no execution record (or QUEUED/SKIPPED/CANCELLED) is neutral.
  const cardBorderColor = isSuccess
    ? colors.success
    : isFailed
    ? colors.danger
    : colors.borderBasePlain;

  const outcome = toChipOutcome({ isRunning, isSuccess, isFailed });
  const chip = getStepChipPalette(euiTheme, family, outcome);

  // Force-fill is true only on outcome (not idle) so brand logos keep their
  // natural palette while idle and only get recoloured when a status fires.
  const forceFill = isSuccess || isFailed;

  return {
    chip,
    stepLabelColor: colors.textHeading,
    cardBorderColor,
    retryBadgeBg: colors.backgroundBaseWarning,
    retryBadgeBorderColor: colors.borderBaseWarning,
    retryBadgeColor: colors.textWarning,
    statusSuccessColor: colors.success,
    statusFailColor: colors.danger,
    hasStatusIcon: isRunning || isSuccess || isFailed,
    forceFill,
  };
}

// ----------- Sub-components -----------

// Renders the step or trigger icon — custom renderStepIcon or EuiIcon fallback.
function NodeStepIcon({
  iconType,
  iconColor,
  forceFill,
  renderStepIcon,
  stepType,
  isTrigger,
}: {
  iconType: ReturnType<typeof getStepIconType>;
  iconColor: string;
  /** When true, force-fills the SVG paths to override rich-colour logos on outcome. */
  forceFill: boolean;
  renderStepIcon?: RenderStepIcon;
  stepType: string;
  isTrigger: boolean;
}) {
  if (renderStepIcon) {
    return (
      <div
        css={[
          { color: iconColor, display: 'flex' },
          forceFill && { '& svg, & svg *': { fill: iconColor } },
        ]}
      >
        {renderStepIcon({ stepType, isTrigger, size: 'm', color: iconColor })}
      </div>
    );
  }
  return (
    <EuiIcon
      type={iconType}
      size="m"
      color={LOGO_ICONS.has(String(iconType)) && !forceFill ? undefined : iconColor}
      css={forceFill ? { '& *, & path': { fill: iconColor } } : undefined}
      aria-hidden={true}
    />
  );
}

// Compact preview card — icon-only, used in the workflow-list hover popover.
function NodePreviewCard({
  stepType,
  label,
  isTrigger,
  isTriggerNode,
  iconType,
  family,
  renderStepIcon,
  targetHandlePos,
  sourceHandlePos,
}: {
  stepType: string;
  label: string;
  isTrigger?: boolean;
  isTriggerNode: boolean;
  iconType: ReturnType<typeof getStepIconType>;
  family: StepFamily;
  renderStepIcon?: RenderStepIcon;
  targetHandlePos: Position;
  sourceHandlePos: Position;
}) {
  const { euiTheme } = useEuiTheme();
  const chip = getStepChipPalette(euiTheme, family, 'none');
  return (
    <>
      {!isTrigger && <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />}
      <div
        aria-label={`${stepType}: ${label}`}
        css={{
          width: '100%',
          height: '100%',
          background: chip.fill,
          border: `1px solid ${chip.border}`,
          borderRadius: euiTheme.border.radius.medium,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <NodeStepIcon
          iconType={iconType}
          iconColor={chip.icon}
          forceFill={false}
          renderStepIcon={renderStepIcon}
          stepType={stepType}
          isTrigger={isTrigger ?? false}
        />
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}

// Warning badge showing the retry-on-failure max-attempts count.
function NodeRetryBadge({
  maxAttempts,
  bgColor,
  borderColor,
  textColor,
  fontFamily,
}: {
  maxAttempts: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  fontFamily: string;
}) {
  return (
    <EuiToolTip
      content={i18n.translate('workflowsUi.graphNode.retryBadgeTooltip', {
        defaultMessage:
          'Retries on failure up to {count, plural, one {# attempt} other {# attempts}}',
        values: { count: maxAttempts },
      })}
      disableScreenReaderOutput
    >
      <div
        tabIndex={0}
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
          background: bgColor,
          border: `1px solid ${borderColor}`,
          color: textColor,
          fontFamily,
          fontSize: 12,
          fontWeight: 400,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <EuiIcon type="refresh" size="s" color={textColor} aria-hidden />
        <span>{maxAttempts}</span>
      </div>
    </EuiToolTip>
  );
}

// Execution-status indicator: spinner (running), check (success), or error (failed).
function NodeStatusIcon({
  isRunning,
  isSuccess,
  successColor,
  failColor,
}: {
  isRunning: boolean;
  isSuccess: boolean;
  successColor: string;
  failColor: string;
}) {
  return (
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
          ? i18n.translate('workflowsUi.graphNode.statusRunning', { defaultMessage: 'Running' })
          : isSuccess
          ? i18n.translate('workflowsUi.graphNode.statusSuccess', {
              defaultMessage: 'Completed successfully',
            })
          : i18n.translate('workflowsUi.graphNode.statusFailed', { defaultMessage: 'Failed' })
      }
    >
      {isRunning ? (
        <EuiLoadingSpinner size="m" />
      ) : isSuccess ? (
        <EuiIcon type="checkCircleFill" color={successColor} size="m" aria-hidden={true} />
      ) : (
        <EuiIcon type="errorFill" color={failColor} size="m" aria-hidden={true} />
      )}
    </div>
  );
}

// Hover-action strip containing the run-step button.
function NodeRunActions({
  onStepRun,
  canRunSteps,
  label,
}: {
  onStepRun?: (label: string) => void;
  canRunSteps?: boolean;
  label: string;
}) {
  const runLabel = i18n.translate('workflowsUi.graphNode.runStep', { defaultMessage: 'Run step' });
  return (
    <div
      css={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}
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
  );
}

// ----------- Main node component -----------

function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const { stepType, label, isTrigger, stepExecution, preview, step } = node.data;
  const { euiTheme } = useEuiTheme();
  const isTriggerNode = isTrigger || TRIGGER_STEP_TYPES.has(stepType);
  // Display-only: trigger labels are already human-readable (getTriggerLabel);
  // step labels are frequently authored as slugs, so deslugify for display.
  // `label` itself must stay untouched — it's used to key execution status.
  const displayLabel = isTriggerNode ? label : deslugifyStepName(label);

  const iconType = isTriggerNode ? getTriggerTypeIconType(stepType) : getStepIconType(stepType);
  const family = getStepFamily(stepType, isTriggerNode);
  const maxAttempts = getStepMaxAttempts(step);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const { onStepRun, canRunSteps, renderStepIcon, onStepSelect } = useWorkflowGraphActions();

  const execState = resolveExecutionState(stepExecution?.status);
  const colors = resolveNodeColors(euiTheme, family, execState);

  const showActions =
    Boolean(canRunSteps && onStepRun) &&
    (isHovered || isActive) &&
    !isTrigger &&
    !colors.hasStatusIcon;

  // Compact icon-only render for the workflow-list hover preview. All hooks
  // above are still called every render, so the early return is safe.
  if (preview) {
    return (
      <NodePreviewCard
        stepType={stepType}
        label={displayLabel}
        isTrigger={isTrigger}
        isTriggerNode={isTriggerNode}
        iconType={iconType}
        family={family}
        renderStepIcon={renderStepIcon}
        targetHandlePos={targetHandlePos}
        sourceHandlePos={sourceHandlePos}
      />
    );
  }

  return (
    <>
      {!isTrigger && <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${stepType} step: ${displayLabel}${
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
            // Border carries execution status — neutral when unexecuted,
            // green on COMPLETED, red on FAILED/TIMED_OUT.
            border: `1px solid ${colors.cardBorderColor}`,
            borderRadius: euiTheme.border.radius.medium,
            display: 'flex',
            alignItems: 'center',
            // Asymmetric padding: chip is 12px from left edge (matching the
            // mockup), retry badge / status icon sit 16px from the right edge.
            padding: '12px 16px 12px 12px',
            gap: 12,
            transition: 'border-color 120ms ease',
          },
          // Selection uses outline so it composes with any border colour:
          // a completed (green-border) or failed (red-border) node still
          // shows a visible selection ring without conflating the two signals.
          isActive && {
            outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`,
            outlineOffset: 2,
          },
        ]}
      >
        {/* Icon chip — 28×28 tinted box whose colours come from the family
            palette at idle and switch to success/danger on execution outcome. */}
        <div
          css={{
            flex: '0 0 auto',
            width: 28,
            height: 28,
            background: colors.chip.fill,
            border: `1px solid ${colors.chip.border}`,
            borderRadius: euiTheme.border.radius.small,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 120ms ease, border-color 120ms ease',
          }}
        >
          <NodeStepIcon
            iconType={iconType}
            iconColor={colors.chip.icon}
            forceFill={colors.forceFill}
            renderStepIcon={renderStepIcon}
            stepType={stepType}
            isTrigger={isTrigger ?? false}
          />
        </div>

        <span
          css={{
            flex: '1 1 auto',
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '24px',
            color: colors.stepLabelColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
          title={displayLabel}
        >
          {displayLabel}
        </span>

        {/* Retry-on-failure badge: the configured max-attempts taken from
            either `step.retry` or `step['on-failure'].retry`. Mirrors the
            badge in the execution detail step list. */}
        {maxAttempts != null && (
          <NodeRetryBadge
            maxAttempts={maxAttempts}
            bgColor={colors.retryBadgeBg}
            borderColor={colors.retryBadgeBorderColor}
            textColor={colors.retryBadgeColor}
            fontFamily={euiTheme.font.family}
          />
        )}

        {colors.hasStatusIcon && (
          <NodeStatusIcon
            isRunning={execState.isRunning}
            isSuccess={execState.isSuccess}
            successColor={colors.statusSuccessColor}
            failColor={colors.statusFailColor}
          />
        )}

        {showActions && (
          <NodeRunActions onStepRun={onStepRun} canRunSteps={canRunSteps} label={label} />
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
