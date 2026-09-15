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
import { PORT_SPRING_EASE, PORT_SPRING_MS } from './workflow_graph_connection_ports';
import { toAnchorRect } from './workflow_graph_insert_control';
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
   * `max-attempts` for the badge) without having to thread the workflow YAML
   * down a second time.
   */
  readonly step?: {
    readonly retry?: { readonly 'max-attempts'?: number };
    readonly 'on-failure'?: { readonly retry?: { readonly 'max-attempts'?: number } };
  };
}

/** Matches Run button spacing (`EuiButtonIcon size="s"`). */
const ACTION_BUTTON_GAP = 4;

/** Node kind drives the destructive menu label and which actions apply. */
type NodeKind = 'trigger' | 'step' | 'fallback';

const insertFlash = (color: string) =>
  keyframes({
    '0%': { boxShadow: `0 0 0 0 ${color}` },
    '40%': { boxShadow: `0 0 0 6px ${color}` },
    '100%': { boxShadow: `0 0 0 0 transparent` },
  });

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
  fill,
  useAiGradient,
}: {
  background: string;
  border: string;
  borderRadius: string | number;
  children: React.ReactNode;
  /** Stretch to the node's inner height so padding stays even on all sides. */
  fill?: boolean;
  useAiGradient?: boolean;
}) {
  const euiThemeContext = useEuiTheme();
  return (
    <div
      css={[
        {
          flex: '0 0 auto',
          ...(fill
            ? { alignSelf: 'stretch', aspectRatio: '1 / 1', width: 'auto' }
            : { width: CHIP_SIZE, height: CHIP_SIZE }),
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
      position="top"
      disableScreenReaderOutput
      display="block"
      // Position the tooltip anchor (not the child) so the tip tracks the badge
      // instead of the node's untransformed flow box.
      anchorProps={{
        css: {
          position: 'absolute',
          top: 0,
          right: 0,
          transform: 'translate(40%, -40%)',
          zIndex: 1,
        },
      }}
    >
      <span
        tabIndex={0}
        data-test-subj="workflowGraphNodeRetryBadge"
        aria-label={retryAria}
        css={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: '1px 6px',
          background: euiTheme.colors.backgroundBaseWarning,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseWarning}`,
          borderRadius: euiTheme.size.l,
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

/**
 * Right-aligned node control: ⋯ opens the step context menu.
 */
function NodeActionCluster({
  nodeId,
  kind,
  canAddErrorHandling,
  edit,
  onMenuOpenChange,
}: {
  nodeId: string;
  kind: NodeKind;
  canAddErrorHandling: boolean;
  edit: WorkflowGraphEditActions;
  onMenuOpenChange?: (open: boolean) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const setMenuOpen = useCallback(
    (open: boolean) => {
      setIsMenuOpen(open);
      onMenuOpenChange?.(open);
    },
    [onMenuOpenChange]
  );
  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen]);

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
  ];
  if (kind !== 'trigger' && canAddErrorHandling) {
    items.push(
      <EuiContextMenuItem
        key="error"
        icon="branch"
        onClick={(e: React.MouseEvent<Element>) => {
          const anchor = toAnchorRect(e.currentTarget);
          closeMenu();
          edit.onInsert({ mode: 'error', stepId: nodeId }, anchor);
        }}
        data-test-subj="workflowGraphNodeMenuAddErrorHandling"
      >
        {i18n.translate('workflowsUi.graphNode.addErrorHandling', {
          defaultMessage: 'Add error handling',
        })}
      </EuiContextMenuItem>
    );
  }
  items.push(
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      css={{ color: euiTheme.colors.textDanger }}
      onClick={run(() => edit.onDeleteNode(nodeId))}
      data-test-subj="workflowGraphNodeMenuDelete"
    >
      {deleteLabel}
    </EuiContextMenuItem>
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
      <EuiPopover
        isOpen={isMenuOpen}
        closePopover={closeMenu}
        panelPaddingSize="none"
        anchorPosition="downRight"
        aria-label={menuLabel}
        ownFocus
        panelProps={{ 'data-test-subj': 'workflowGraphNodeMenuPanel' }}
        button={
          <EuiToolTip content={menuLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="boxesVertical"
              size="s"
              color="text"
              aria-label={menuLabel}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setMenuOpen(!isMenuOpen)}
              data-test-subj="workflowGraphNodeMenuButton"
            />
          </EuiToolTip>
        }
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
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
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const isActive = node.selected;
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { onStepRun, canRunSteps, renderStepIcon, onStepSelect, edit, incompleteNodeIds, portTargetsByNodeId } =
    useWorkflowGraphActions();

  const execState = resolveExecutionState(stepExecution?.status);
  const colors = resolveNodeColors(euiTheme, stepType, isTriggerNode, execState);
  const borderRadius = euiTheme.border.radius.small ?? 4;

  const canShowRun =
    Boolean(canRunSteps && onStepRun) && !isTrigger && !colors.hasStatusIcon;
  const isFallback = Boolean(fallbackOf);
  const nodeKind: NodeKind = isTriggerNode ? 'trigger' : isFallback ? 'fallback' : 'step';
  const hasOnFailure = Boolean((step as Record<string, unknown> | undefined)?.['on-failure']);
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
          fill
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

        {isIncomplete && <NodeIncompleteIndicator />}

        {maxAttempts != null && <NodeRetryBadge maxAttempts={maxAttempts} />}

        {colors.hasStatusIcon && (
          <NodeStatusIcon
            isRunning={execState.isRunning}
            isSuccess={execState.isSuccess}
            successColor={colors.statusSuccessColor}
            failColor={colors.statusFailColor}
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
              // full card width; expand on hover/focus and let the label ellipsize.
              width: trailingReveal ? 'auto' : 0,
              maxWidth: trailingReveal ? 'none' : 0,
              overflow: 'hidden',
              opacity: trailingReveal ? 1 : 0,
              pointerEvents: trailingReveal ? 'auto' : 'none',
              [euiCanAnimate]: {
                transition: `opacity ${PORT_SPRING_MS} ${PORT_SPRING_EASE}`,
              },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
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
                canAddErrorHandling={
                  nodeKind === 'step' &&
                  !hasOnFailure &&
                  stepType !== 'if' &&
                  stepType !== 'foreach' &&
                  stepType !== 'parallel' &&
                  stepType !== 'while' &&
                  stepType !== 'merge'
                }
                edit={edit}
                onMenuOpenChange={setIsMenuOpen}
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
          {hasOnFailure && (
            <Handle
              type="source"
              id="error"
              // Error port is orientation-invariant: always bottom-right corner.
              position={Position.Bottom}
              style={{ opacity: 0, ...errorHandleStyle() }}
            />
          )}
        </>
      ) : hasOnFailure ? (
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
