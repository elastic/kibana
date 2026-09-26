/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonIcon,
  euiCanAnimate,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  euiFocusRing,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { keyframes } from '@emotion/react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, TRIGGER_STEP_TYPES } from '@kbn/workflows';
import { deslugifyStepName } from './deslugify_step_name';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { aiIconTileCss } from './ai_icon_tile';
import { resolveNodeChipStyle } from './resolve_node_chip_style';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import type { RenderStepIcon, WorkflowGraphEditActions } from './workflow_graph_actions_context';
import { FORK_BUS_TRUNK } from './compute_edge_path';
import {
  handleAlongStyle,
  IF_PORT_FALSE,
  IF_PORT_TRUE,
  STEP_PORT,
  errorHandleStyle,
} from './port_geometry';
import { WorkflowGraphConnectionPorts } from './workflow_graph_connection_ports';
import { INSERT_FLASH_MS } from './use_insert_layout_animation';
import { getStepIconType, getTriggerTypeIconType } from '../step_icons';

export interface WorkflowGraphNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly stepType: string;
  readonly isTrigger?: boolean;
  readonly stepExecution?: WorkflowStepExecutionDto;
  /** Icon-only compact render (workflow-list popover). */
  readonly preview?: boolean;
  /** Set when this step is a fallback in its parent's `on-failure` route. */
  readonly fallbackOf?: string;
  /** Edit mode: node was just inserted — play the brief highlight. */
  readonly flash?: boolean;
  /**
   * Raw step definition attached by `transformWorkflowToGraph`. Read by the
   * node to surface configuration the row UI cares about (e.g. retry-on-failure
   * `max-attempts` / continue-on-failure for corner badges) without having to
   * thread the workflow YAML down a second time.
   */
  readonly step?: {
    readonly retry?: { readonly 'max-attempts'?: number; readonly delay?: string };
    readonly 'on-failure'?: {
      readonly retry?: { readonly 'max-attempts'?: number; readonly delay?: string };
      readonly continue?: boolean;
      readonly fallback?: readonly unknown[];
    };
  };
}

/** Matches Run button spacing (`EuiButtonIcon size="s"`). */
const ACTION_BUTTON_GAP = 4;

const insertFlash = (color: string) =>
  keyframes({
    '0%': { boxShadow: `0 0 0 0 ${color}` },
    '40%': { boxShadow: `0 0 0 6px ${color}` },
    '100%': { boxShadow: `0 0 0 0 transparent` },
  });

/** Node kind drives the destructive menu label and which actions apply. */
type NodeKind = 'trigger' | 'step' | 'fallback';

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

/** Retry delay string when retry is configured; defaults to `5s` for tooltips. */
function getStepRetryDelay(step: WorkflowGraphNodeData['step']): string | undefined {
  if (getStepMaxAttempts(step) == null) return undefined;
  const fromDirect = step?.retry?.delay;
  const fromOnFailure = step?.['on-failure']?.retry?.delay;
  const value = fromDirect ?? fromOnFailure;
  return typeof value === 'string' && value.length > 0 ? value : '5s';
}

/** True when `on-failure.continue` is enabled. */
function getStepContinuesOnFailure(step: WorkflowGraphNodeData['step']): boolean {
  return step?.['on-failure']?.continue === true;
}

/** True when `on-failure.fallback` has at least one step (graph error route). */
function getStepHasFallback(step: WorkflowGraphNodeData['step']): boolean {
  const fallback = step?.['on-failure']?.fallback;
  return Array.isArray(fallback) && fallback.length > 0;
}

const CHIP_SIZE = 32;

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
  readonly chipUseAiGradient: boolean;
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
    chipUseAiGradient: chip.useAiGradient ?? false,
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
  useAiGradient,
}: {
  iconType: ReturnType<typeof getStepIconType>;
  iconColor: string | undefined;
  renderStepIcon?: RenderStepIcon;
  stepType: string;
  isTrigger: boolean;
  useAiGradient?: boolean;
}) {
  if (useAiGradient && iconType === 'sparkles') {
    return <AiIcon iconType="sparkles" size="m" aria-hidden />;
  }
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
  useAiGradient,
}: {
  background: string;
  border: string;
  borderRadius: string | number;
  children: React.ReactNode;
  useAiGradient?: boolean;
}) {
  const euiThemeContext = useEuiTheme();
  return (
    <div
      css={[
        {
          flex: '0 0 auto',
          width: CHIP_SIZE,
          height: CHIP_SIZE,
          ...(useAiGradient
            ? {}
            : { background, border: `1px solid ${border}` }),
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 120ms ease, border-color 120ms ease',
        },
        useAiGradient ? aiIconTileCss(euiThemeContext) : {},
      ]}
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
  chipUseAiGradient,
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
  chipUseAiGradient?: boolean;
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
        <NodeIconChip
          background={chipBackground}
          border={chipBorder}
          borderRadius={borderRadius}
          useAiGradient={chipUseAiGradient}
        >
          <NodeStepIcon
            iconType={iconType}
            iconColor={chipIconColor}
            renderStepIcon={renderStepIcon}
            stepType={stepType}
            isTrigger={isTrigger ?? false}
            useAiGradient={chipUseAiGradient}
          />
        </NodeIconChip>
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}

/**
 * Compact warning-family badge for retry / continue-on-failure posture.
 *
 * Color is warning/yellow only — never danger/red. Retry and continue-on-failure
 * are *configured behaviour, not a failure state*; red is reserved for error
 * paths and run failures, and using it here would make correctly-configured
 * steps look broken on an idle canvas.
 *
 * Always visible at rest (not tied to node hover) — posture should read
 * without requiring interaction.
 */
function NodeFailureBadge({
  maxAttempts,
  delay,
  continuesOnFailure,
}: {
  maxAttempts: number | undefined;
  delay: string | undefined;
  continuesOnFailure: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  if (maxAttempts == null && !continuesOnFailure) return null;

  let tooltip: string;
  if (maxAttempts != null && continuesOnFailure) {
    tooltip = i18n.translate('workflowsUi.graphNode.failureBadge.retryAndContinueTooltip', {
      defaultMessage:
        'Retries {count}× ({delay} delay), then the workflow continues if it still fails',
      values: { count: maxAttempts, delay: delay ?? '5s' },
    });
  } else if (maxAttempts != null) {
    tooltip = i18n.translate('workflowsUi.graphNode.failureBadge.retryTooltip', {
      defaultMessage:
        'Retries {count}× ({delay} delay), then the workflow stops if it still fails',
      values: { count: maxAttempts, delay: delay ?? '5s' },
    });
  } else {
    tooltip = i18n.translate('workflowsUi.graphNode.failureBadge.continueTooltip', {
      defaultMessage: 'The workflow continues if this step fails',
    });
  }

  const isContinueOnly = maxAttempts == null && continuesOnFailure;

  return (
    <EuiToolTip content={tooltip} delay="long" disableScreenReaderOutput>
      <EuiBadge
        color="warning"
        // Continue-only: put the icon in children (not iconType) so we keep the
        // default badge padding / text inset — iconOnly uses tighter xs padding
        // and reads as a cramped square next to retry pills.
        iconType={isContinueOnly ? undefined : 'refresh'}
        tabIndex={0}
        aria-label={tooltip}
        data-test-subj="workflowGraphNodeFailureBadge"
        css={{
          flex: '0 0 auto',
          cursor: 'default',
          '&:focus-visible': { outline: `2px solid ${euiTheme.colors.primary}` },
        }}
      >
        {isContinueOnly ? (
          <EuiIcon type="sortRight" size="s" aria-hidden />
        ) : (
          <>
            {maxAttempts != null ? (
              <span data-test-subj="workflowGraphNodeFailureBadgeAttempts">{maxAttempts}</span>
            ) : null}
            {maxAttempts != null && continuesOnFailure ? (
              <>
                <span
                  aria-hidden
                  css={{
                    display: 'inline-block',
                    width: 1,
                    height: 10,
                    background: euiTheme.colors.borderBaseWarning,
                    marginInline: 4,
                    verticalAlign: 'middle',
                  }}
                />
                <EuiIcon
                  type="sortRight"
                  size="s"
                  aria-label={i18n.translate('workflowsUi.graphNode.failureBadge.continueGlyph', {
                    defaultMessage: 'Continue on failure',
                  })}
                />
              </>
            ) : null}
          </>
        )}
      </EuiBadge>
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

function NodeIncompleteIndicator() {
  const { euiTheme } = useEuiTheme();
  const message = i18n.translate('workflowsUi.graphNode.incompleteTooltip', {
    defaultMessage: 'Incomplete — required fields are missing',
  });
  return (
    <EuiToolTip content={message} disableScreenReaderOutput>
      <span
        tabIndex={0}
        role="img"
        aria-label={message}
        data-test-subj="workflowGraphNodeIncomplete"
        css={{
          position: 'absolute',
          top: euiTheme.size.xs,
          right: euiTheme.size.xs,
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: 2,
          background: euiTheme.colors.backgroundBasePlain,
          '&:focus-visible': { outline: `2px solid ${euiTheme.colors.primary}` },
        }}
      >
        <EuiIcon type="warningFill" size="m" color={euiTheme.colors.textWarning} aria-hidden />
      </span>
    </EuiToolTip>
  );
}

/** Closed, or open from the ⋯ button / a right-click at viewport coords. */
type NodeMenuState =
  | { readonly open: false }
  | { readonly open: true; readonly at?: { readonly x: number; readonly y: number } };

/**
 * Right-aligned node control: ⋯ opens the step context menu.
 * Right-click passes `at` so the same menu opens under the cursor.
 */
function NodeActionCluster({
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
  const { euiTheme } = useEuiTheme();
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const isMenuOpen = menu.open;
  const cursorAt = menu.open ? menu.at : undefined;
  const closeMenu = useCallback(() => onMenuChange({ open: false }), [onMenuChange]);

  // React Flow's pane uses pointer events / stopPropagation that can skip
  // EuiPopover's document mouseup outside-click detector — close on any
  // pointerdown outside this cluster and its portaled panel.
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        closeMenu();
        return;
      }
      if (clusterRef.current?.contains(target)) return;
      if (target.closest('[data-test-subj="workflowGraphNodeMenuPanel"]')) return;
      if (target.closest('[data-test-subj="workflowGraphNodeContextMenuAnchor"]')) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isMenuOpen, closeMenu]);

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

  const items: React.ReactElement[] = [
    <EuiContextMenuItem
      key="edit"
      icon="pencil"
      onClick={run(() => edit.onEditStep(nodeId))}
      data-test-subj="workflowGraphNodeMenuEdit"
    >
      {i18n.translate('workflowsUi.graphNode.editStep', { defaultMessage: 'Edit step' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      css={{ color: euiTheme.colors.textDanger }}
      onClick={run(() => edit.onDeleteNode(nodeId))}
      data-test-subj="workflowGraphNodeMenuDelete"
    >
      {deleteLabel}
    </EuiContextMenuItem>,
  ];

  const menuPanel = <EuiContextMenuPanel items={items} />;

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
                zIndex: 10000,
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

/** true/false pills on the fork trunk past each branch port. */
function BranchPortPills({ isHorizontal }: { readonly isHorizontal: boolean }) {
  const { euiTheme } = useEuiTheme();
  const pillShadow = useEuiShadow('xs', { border: 'none' });
  const trunkMid = FORK_BUS_TRUNK / 2;
  const pillCss = [
    {
      position: 'absolute' as const,
      // Midpoint of the fork trunk so the pill sits on the straight stub before
      // the outward curve (FORK_BUS_TRUNK is measured from the source handle).
      ...(isHorizontal
        ? {
            right: -trunkMid,
            transform: 'translate(50%, -50%)',
          }
        : {
            bottom: -trunkMid,
            transform: 'translate(-50%, 50%)',
          }),
      fontFamily: euiTheme.font.familyCode,
      fontSize: 11,
      fontWeight: 400,
      lineHeight: '14px',
      padding: `2px ${euiTheme.size.s}`,
      borderRadius: euiTheme.size.l,
      background: euiTheme.colors.backgroundBasePlain,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      color: euiTheme.colors.textParagraph,
      whiteSpace: 'nowrap' as const,
      pointerEvents: 'none' as const,
      zIndex: 4,
    },
    pillShadow,
  ];
  return (
    <>
      <span
        aria-hidden={true}
        data-test-subj="workflowGraphBranchPill-true"
        css={[
          ...pillCss,
          isHorizontal ? { top: IF_PORT_TRUE } : { left: IF_PORT_TRUE },
        ]}
      >
        true
      </span>
      <span
        aria-hidden={true}
        data-test-subj="workflowGraphBranchPill-false"
        css={[
          ...pillCss,
          isHorizontal ? { top: IF_PORT_FALSE } : { left: IF_PORT_FALSE },
        ]}
      >
        false
      </span>
    </>
  );
}

function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const { stepType, label, isTrigger, stepExecution, preview, step, fallbackOf, flash } = node.data;
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  // TODO: switch to xxs when available
  // Keep the panel on Border Plain; the shadow mixin otherwise overlays a subdued ring in dark mode.
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const isTriggerNode = isTrigger || TRIGGER_STEP_TYPES.has(stepType);
  const displayLabel = isTriggerNode ? label : deslugifyStepName(label);

  const iconType = isTriggerNode ? getTriggerTypeIconType(stepType) : getStepIconType(stepType);
  const maxAttempts = getStepMaxAttempts(step);
  const retryDelay = getStepRetryDelay(step);
  const continuesOnFailure = getStepContinuesOnFailure(step);
  const hasFailureBadge = maxAttempts != null || continuesOnFailure;
  const hasFallback = getStepHasFallback(step);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [menu, setMenu] = useState<NodeMenuState>({ open: false });
  const isMenuOpen = menu.open;
  const { onStepRun, canRunSteps, renderStepIcon, onStepSelect, edit, incompleteNodeIds, portTargetsByNodeId } =
    useWorkflowGraphActions();

  const execState = resolveExecutionState(stepExecution?.status);
  const colors = resolveNodeColors(euiTheme, stepType, isTriggerNode, execState);
  const borderRadius = euiTheme.border.radius.small ?? 4;

  const canShowRun =
    Boolean(canRunSteps && onStepRun) && !isTrigger && !colors.hasStatusIcon;
  const isFallback = Boolean(fallbackOf);
  const nodeKind: NodeKind = isTriggerNode ? 'trigger' : isFallback ? 'fallback' : 'step';
  const isIncomplete = Boolean(incompleteNodeIds?.has(node.id));
  const editMode = edit !== undefined && !preview;
  const isIfNode = stepType === 'if';
  const portTargets = editMode ? portTargetsByNodeId?.get(node.id) : undefined;
  const portsReveal = isHovered || isFocusWithin;
  const trailingReveal = portsReveal || isActive || isMenuOpen;
  const isHorizontal = sourceHandlePos === Position.Right;
  const layoutDirection = isHorizontal ? 'LR' : 'TB';

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
        chipUseAiGradient={colors.chipUseAiGradient}
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
        onFocus={() => setIsFocusWithin(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) {
            setIsFocusWithin(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onStepSelect?.(node.id);
            return;
          }
          if (editMode && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            edit.onDeleteNode(node.id);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          onStepSelect?.(node.id);
        }}
        onContextMenu={(e) => {
          if (!editMode) return;
          e.preventDefault();
          e.stopPropagation();
          setMenu({ open: true, at: { x: e.clientX, y: e.clientY } });
        }}
        data-test-subj={`workflowGraphNode-${node.id}`}
        css={[
          {
            position: 'relative',
            width: '100%',
            height: '100%',
            background: euiTheme.colors.backgroundBasePlain,
            // Keep a stable thin border so selection never changes node size.
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
            // Selection ring sits outside via ::after so it does not fight the
            // drop shadow or inflate the layout box.
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              boxShadow: isActive ? `0 0 0 2px ${euiTheme.colors.primary}` : 'none',
              transition: 'box-shadow 120ms ease',
            },
          },
          nodeShadow,
          flash
            ? {
                [euiCanAnimate]: {
                  animation: `${insertFlash(
                    euiTheme.colors.backgroundLightPrimary
                  )} ${INSERT_FLASH_MS}ms ease-out`,
                },
              }
            : {},
        ]}
      >
        <NodeIconChip
          background={colors.chipBackground}
          border={colors.chipBorder}
          borderRadius={borderRadius}
          useAiGradient={colors.chipUseAiGradient}
        >
          <NodeStepIcon
            iconType={iconType}
            iconColor={colors.chipIconColor}
            renderStepIcon={renderStepIcon}
            stepType={stepType}
            isTrigger={isTrigger ?? false}
            useAiGradient={colors.chipUseAiGradient}
          />
        </NodeIconChip>

        <div
          css={{
            flex: '1 1 auto',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span
            css={{
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '24px',
              color: colors.stepLabelColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={displayLabel}
          >
            {displayLabel}
          </span>
        </div>

        {isIncomplete && <NodeIncompleteIndicator />}

        {colors.hasStatusIcon && (
          <NodeStatusIcon
            isRunning={execState.isRunning}
            isSuccess={execState.isSuccess}
            successColor={colors.statusSuccessColor}
            failColor={colors.statusFailColor}
          />
        )}

        {hasFailureBadge && (
          <NodeFailureBadge
            maxAttempts={maxAttempts}
            delay={retryDelay}
            continuesOnFailure={continuesOnFailure}
          />
        )}
        {(canShowRun || editMode) && (
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: trailingReveal ? ACTION_BUTTON_GAP : 0,
              flex: '0 0 auto',
              // Collapse out of the flex row at rest so the label can use the
              // full card width. Negative start margin cancels the parent flex
              // `gap` so a zero-width slot does not inflate the right inset.
              marginInlineStart: trailingReveal ? 0 : `calc(-1 * ${euiTheme.size.m})`,
              width: trailingReveal ? 'auto' : 0,
              maxWidth: trailingReveal ? 'none' : 0,
              overflow: 'hidden',
              opacity: trailingReveal ? 1 : 0,
              pointerEvents: trailingReveal ? 'auto' : 'none',
            }}
            data-test-subj="workflowGraphNodeTrailingActions"
          >
            {canShowRun && (
              <NodeRunActions onStepRun={onStepRun} canRunSteps={canRunSteps} label={label} />
            )}
            {editMode && (
              <NodeActionCluster
                nodeId={node.id}
                kind={nodeKind}
                edit={edit}
                menu={menu}
                onMenuChange={setMenu}
              />
            )}
          </div>
        )}
        {isIfNode && !preview && <BranchPortPills isHorizontal={isHorizontal} />}
        {editMode && edit && portTargets && (
          <WorkflowGraphConnectionPorts
            ports={portTargets}
            edit={edit}
            nodeHovered={portsReveal}
            direction={layoutDirection}
          />
        )}
      </div>
      {isIfNode ? (
        <>
          <Handle
            type="source"
            id="then"
            position={sourceHandlePos}
            style={{ opacity: 0, ...handleAlongStyle(IF_PORT_TRUE, isHorizontal) }}
          />
          <Handle
            type="source"
            id="else"
            position={sourceHandlePos}
            style={{ opacity: 0, ...handleAlongStyle(IF_PORT_FALSE, isHorizontal) }}
          />
          {hasFallback && (
            <Handle
              type="source"
              id="error"
              // Error port is orientation-invariant: always bottom-right corner.
              position={Position.Bottom}
              style={{ opacity: 0, ...errorHandleStyle() }}
            />
          )}
        </>
      ) : hasFallback ? (
        <>
          <Handle
            type="source"
            id="step"
            position={sourceHandlePos}
            style={{ opacity: 0, ...handleAlongStyle(STEP_PORT, isHorizontal) }}
          />
          <Handle
            type="source"
            id="error"
            // Error port is orientation-invariant: always bottom-right corner.
            position={Position.Bottom}
            style={{ opacity: 0, ...errorHandleStyle() }}
          />
        </>
      ) : (
        <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
      )}
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
    prev.data.fallbackOf === next.data.fallbackOf &&
    prev.data.flash === next.data.flash &&
    prev.selected === next.selected &&
    prev.targetPosition === next.targetPosition &&
    prev.sourcePosition === next.sourcePosition &&
    prev.positionAbsoluteX === next.positionAbsoluteX &&
    prev.positionAbsoluteY === next.positionAbsoluteY
  );
}

export const WorkflowGraphNode = memo(WorkflowGraphNodeInner, nodePropsAreEqual);
