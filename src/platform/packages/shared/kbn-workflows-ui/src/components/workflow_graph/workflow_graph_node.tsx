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
  euiFocusRing,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, TRIGGER_STEP_TYPES } from '@kbn/workflows';
import { deslugifyStepName } from './deslugify_step_name';
import { resolveNodeChipStyle } from './resolve_node_chip_style';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import type { RenderStepIcon } from './workflow_graph_actions_context';
import { getStepIconType, getTriggerTypeIconType } from '../step_icons';

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

const CHIP_SIZE = 28;

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

interface ExecutionState {
  readonly isRunning: boolean;
  readonly isSuccess: boolean;
  readonly isFailed: boolean;
}

function resolveExecutionState(execStatus: ExecutionStatus | undefined): ExecutionState {
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
  return { isRunning, isSuccess, isFailed };
}

interface NodeColors {
  readonly chipBackground: string;
  readonly chipBorder: string;
  readonly chipIconColor: string | undefined;
  readonly isBrandChip: boolean;
  readonly stepLabelColor: string;
  readonly panelBorder: string;
  readonly statusSuccessColor: string;
  readonly statusFailColor: string;
  readonly hasStatusIcon: boolean;
}

export function resolveNodeColors(
  euiTheme: EuiTheme,
  stepType: string,
  isTriggerNode: boolean,
  { isRunning, isSuccess, isFailed }: ExecutionState
): NodeColors {
  const { colors } = euiTheme;
  const chip = resolveNodeChipStyle(euiTheme, stepType, isTriggerNode, { isSuccess, isFailed });

  const panelBorder = isSuccess
    ? colors.success
    : isFailed
    ? colors.danger
    : colors.borderBasePlain;

  return {
    chipBackground: chip.background,
    chipBorder: chip.border,
    chipIconColor: chip.iconColor,
    isBrandChip: chip.isBrand,
    stepLabelColor: colors.textHeading,
    panelBorder,
    statusSuccessColor: colors.success,
    statusFailColor: colors.danger,
    hasStatusIcon: isRunning || isSuccess || isFailed,
  };
}

// ----------- Sub-components -----------

function NodeStepIcon({
  iconType,
  iconColor,
  renderStepIcon,
  stepType,
  isTrigger,
}: {
  iconType: ReturnType<typeof getStepIconType>;
  iconColor: string | undefined;
  renderStepIcon?: RenderStepIcon;
  stepType: string;
  isTrigger: boolean;
}) {
  if (renderStepIcon) {
    return (
      <div
        css={[
          { color: iconColor, display: 'flex' },
          iconColor ? { '& svg, & svg *': { fill: iconColor } } : undefined,
        ]}
      >
        {renderStepIcon({ stepType, isTrigger, size: 'm', color: iconColor })}
      </div>
    );
  }
  return <EuiIcon type={iconType} size="m" color={iconColor} aria-hidden={true} />;
}

function NodeIconChip({
  background,
  border,
  borderRadius,
  children,
  fill,
}: {
  background: string;
  border: string;
  borderRadius: string | number;
  children: React.ReactNode;
  /** Stretch to the node's inner height so padding stays even on all sides. */
  fill?: boolean;
}) {
  return (
    <div
      css={{
        flex: '0 0 auto',
        ...(fill
          ? { alignSelf: 'stretch', aspectRatio: '1 / 1', width: 'auto' }
          : { width: CHIP_SIZE, height: CHIP_SIZE }),
        background,
        border: `1px solid ${border}`,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      {children}
    </div>
  );
}

function NodePreviewCard({
  stepType,
  label,
  isTrigger,
  iconType,
  chipBackground,
  chipBorder,
  chipIconColor,
  panelBorder,
  borderRadius,
  nodeShadow,
  renderStepIcon,
  targetHandlePos,
  sourceHandlePos,
}: {
  stepType: string;
  label: string;
  isTrigger?: boolean;
  iconType: ReturnType<typeof getStepIconType>;
  chipBackground: string;
  chipBorder: string;
  chipIconColor: string | undefined;
  panelBorder: string;
  borderRadius: string | number;
  nodeShadow: string;
  renderStepIcon?: RenderStepIcon;
  targetHandlePos: Position;
  sourceHandlePos: Position;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {!isTrigger && <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />}
      <div
        aria-label={`${stepType}: ${label}`}
        css={[
          {
            width: '100%',
            height: '100%',
            background: euiTheme.colors.backgroundBasePlain,
            border: `${euiTheme.border.width.thin} solid ${panelBorder}`,
            borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          nodeShadow,
        ]}
      >
        <NodeIconChip background={chipBackground} border={chipBorder} borderRadius={borderRadius}>
          <NodeStepIcon
            iconType={iconType}
            iconColor={chipIconColor}
            renderStepIcon={renderStepIcon}
            stepType={stepType}
            isTrigger={isTrigger ?? false}
          />
        </NodeIconChip>
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}

function NodeRetryBadge({ maxAttempts }: { maxAttempts: number }) {
  const { euiTheme } = useEuiTheme();
  const retryAria = i18n.translate('workflowsUi.graphNode.retryBadgeAria', {
    defaultMessage: '{count, plural, one {# retry} other {# retries}} on failure',
    values: { count: maxAttempts },
  });
  return (
    <EuiToolTip
      content={i18n.translate('workflowsUi.graphNode.retryBadgeTooltip', {
        defaultMessage:
          'Retries on failure up to {count, plural, one {# attempt} other {# attempts}}',
        values: { count: maxAttempts },
      })}
      disableScreenReaderOutput
    >
      <span
        tabIndex={0}
        data-test-subj="workflowGraphNodeRetryBadge"
        aria-label={retryAria}
        css={{
          position: 'absolute',
          top: 0,
          right: 0,
          transform: 'translate(40%, -40%)',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: '1px 6px',
          background: euiTheme.colors.backgroundBaseWarning,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseWarning}`,
          borderRadius: euiTheme.border.radius.small ?? 4,
          color: euiTheme.colors.textWarning,
          fontFamily: euiTheme.font.family,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: '16px',
        }}
      >
        <EuiIcon type="refresh" size="s" color={euiTheme.colors.textWarning} aria-hidden={true} />
        {maxAttempts}
      </span>
    </EuiToolTip>
  );
}

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
        flex: '0 0 auto',
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

function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const { stepType, label, isTrigger, stepExecution, preview, step } = node.data;
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  // TODO: switch to xxs when available
  // Keep the panel on Border Plain; the shadow mixin otherwise overlays a subdued ring in dark mode.
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const isTriggerNode = isTrigger || TRIGGER_STEP_TYPES.has(stepType);
  const displayLabel = isTriggerNode ? label : deslugifyStepName(label);

  const iconType = isTriggerNode ? getTriggerTypeIconType(stepType) : getStepIconType(stepType);
  const maxAttempts = getStepMaxAttempts(step);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const { onStepRun, canRunSteps, renderStepIcon, onStepSelect } = useWorkflowGraphActions();

  const execState = resolveExecutionState(stepExecution?.status);
  const colors = resolveNodeColors(euiTheme, stepType, isTriggerNode, execState);
  const borderRadius = euiTheme.border.radius.small ?? 4;

  const showActions =
    Boolean(canRunSteps && onStepRun) &&
    (isHovered || isActive) &&
    !isTrigger &&
    !colors.hasStatusIcon;

  if (preview) {
    return (
      <NodePreviewCard
        stepType={stepType}
        label={displayLabel}
        isTrigger={isTrigger}
        iconType={iconType}
        chipBackground={colors.chipBackground}
        chipBorder={colors.chipBorder}
        chipIconColor={colors.chipIconColor}
        panelBorder={colors.panelBorder}
        borderRadius={borderRadius}
        nodeShadow={nodeShadow}
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
            border: `${euiTheme.border.width.thin} solid ${colors.panelBorder}`,
            borderRadius,
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            gap: euiTheme.size.m,
            padding: euiTheme.size.m,
            overflow: 'visible',
            transition: 'border-color 120ms ease, background 120ms ease, box-shadow 120ms ease',
            '&:focus': { outline: 'none' },
            '&:focus-visible': euiFocusRing(euiThemeContext),
          },
          nodeShadow,
        ]}
      >
        <NodeIconChip
          background={colors.chipBackground}
          border={colors.chipBorder}
          borderRadius={borderRadius}
          fill
        >
          <NodeStepIcon
            iconType={iconType}
            iconColor={colors.chipIconColor}
            renderStepIcon={renderStepIcon}
            stepType={stepType}
            isTrigger={isTrigger ?? false}
          />
        </NodeIconChip>

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

        {maxAttempts != null && <NodeRetryBadge maxAttempts={maxAttempts} />}

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
