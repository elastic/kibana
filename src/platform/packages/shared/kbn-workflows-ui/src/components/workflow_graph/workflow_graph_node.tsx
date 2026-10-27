/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, euiFocusRing, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { keyframes } from '@emotion/react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { TRIGGER_STEP_TYPES } from '@kbn/workflows';
import type { NodePortTargets } from './compute_insertion_points';
import { deslugifyStepName } from './deslugify_step_name';
import { NodeActionCluster, NodeRunActions } from './node_action_menu';
import type { NodeKind, NodeMenuState } from './node_action_menu';
import { NodeConfigWarningIndicator, NodeFailureBadge, NodeStatusIcon } from './node_badges';
import { NodeIconChip, NodeStepIcon } from './node_icon_chip';
import { NodeSourceHandles } from './node_source_handles';
import {
  CHIP_BORDER_RADIUS,
  NODE_BORDER_RADIUS,
  nodeLabelTypography,
  selectionRingStyle,
} from './node_styles';
import { errorHandleStyle } from './port_geometry';
import { resolveExecutionState, resolveNodeColors } from './resolve_node_colors';
import {
  getStepContinuesOnFailure,
  getStepHasFallback,
  getStepMaxAttempts,
  getStepRetryDelay,
} from './step_failure_config';
import type { StepFailureConfig } from './step_failure_config';
import { INSERT_FLASH_MS } from './use_insert_layout_animation';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import type { NodeConfigWarningReason, RenderStepIcon } from './workflow_graph_actions_context';
import { WorkflowGraphConnectionPorts } from './workflow_graph_connection_ports';
import { getStepIconType, getTriggerTypeIconType } from '../step_icons';

export { resolveNodeColors };

export interface WorkflowGraphNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly stepType: string;
  readonly isTrigger?: boolean;
  readonly stepExecution?: WorkflowStepExecutionDto;
  /** Icon-only compact render (workflow-list popover). */
  readonly preview?: boolean;
  /**
   * Node id of the step that owns this node's fallback lane. Present on every
   * node inside an `on-failure.fallback` lane; absent elsewhere. Consumed by
   * the minimap colour callback and specs 03/07 for gestural authoring.
   */
  readonly fallbackOf?: string;
  /** Edit mode: node was just inserted — play the brief highlight. */
  readonly flash?: boolean;
  /**
   * Edit mode: this node's connection-point targets. Written by the canvas
   * (reference-stable while this node's own ports are unchanged) instead of
   * travelling through the shared actions context.
   */
  readonly portTargets?: NodePortTargets;
  /** Applied-state config warning for the top-right badge (set by the canvas). */
  readonly configWarning?: NodeConfigWarningReason;
  /** True while an error-path insert originating at this node is in progress. */
  readonly creatingErrorPath?: boolean;
  /**
   * Raw step definition attached by `transformWorkflowToGraph`. Read by the
   * node to surface configuration the row UI cares about (e.g. retry-on-failure
   * `max-attempts` / continue-on-failure for corner badges) without having to
   * thread the workflow YAML down a second time.
   */
  readonly step?: StepFailureConfig;
}

/** Matches Run button spacing (`EuiButtonIcon size="s"`). */
const ACTION_BUTTON_GAP = 4;

const TRAILING_ACTIONS_CLASS = 'workflowGraphNodeTrailingActions';

/** Revealed state of the trailing actions row (hover / focus-within / selected / menu open). */
const TRAILING_ACTIONS_REVEALED = {
  gap: ACTION_BUTTON_GAP,
  marginInlineStart: 0,
  width: 'auto',
  maxWidth: 'none',
  opacity: 1,
  pointerEvents: 'auto',
} as const;

/** Flash colour is supplied per node via this custom property so the keyframes stay static. */
const INSERT_FLASH_COLOR_VAR = '--workflowGraphInsertFlashColor';

const insertFlash = keyframes({
  '0%': { boxShadow: `0 0 0 0 var(${INSERT_FLASH_COLOR_VAR})` },
  '40%': { boxShadow: `0 0 0 6px var(${INSERT_FLASH_COLOR_VAR})` },
  '100%': { boxShadow: `0 0 0 0 transparent` },
});

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
  chipBorderRadius,
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
  chipBorderRadius: string | number;
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
        aria-label={i18n.translate('workflowsUi.graphNode.previewCardAriaLabel', {
          defaultMessage: '{stepType}: {label}',
          values: { stepType, label },
        })}
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
          borderRadius={chipBorderRadius}
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
      {/* Secondary source handle for the fallback edge — always on the bottom
          edge. `Position.Bottom` is unconditional: in LR the fallback margin
          is below the spine, so the route must leave the bottom edge rather
          than the right centre. `errorHandleStyle()` places it at
          `ERROR_PORT_ALONG`, the same along-edge fraction as the visible
          red port (`ConnectedErrorPort` / `PortButton`), so the edge and its
          anchor line up. React Flow reads sourceHandle="fallback" on the edge
          to pick these coordinates. */}
      <Handle
        type="source"
        id="fallback"
        position={Position.Bottom}
        style={{ opacity: 0, ...errorHandleStyle() }}
      />
    </>
  );
}

function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const {
    stepType,
    label,
    isTrigger,
    stepExecution,
    preview,
    step,
    fallbackOf,
    flash,
    portTargets: nodePortTargets,
    configWarning: configWarningReason,
    creatingErrorPath,
  } = node.data;
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  // TODO: switch to xxs when available
  // Keep the panel on Border Plain; the shadow mixin otherwise overlays a subdued ring in dark mode.
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const isTriggerNode = isTrigger || TRIGGER_STEP_TYPES.has(stepType);
  // Display-only: trigger labels are already human-readable (getTriggerName);
  // step labels are frequently authored as slugs, so deslugify for display.
  // `label` itself must stay untouched — it's used to key execution status.
  const displayLabel = isTriggerNode ? label : deslugifyStepName(label);

  const iconType = isTriggerNode ? getTriggerTypeIconType(stepType) : getStepIconType(stepType);
  const maxAttempts = getStepMaxAttempts(step);
  const retryDelay = getStepRetryDelay(step);
  const continuesOnFailure = getStepContinuesOnFailure(step);
  const hasFailureBadge = maxAttempts != null || continuesOnFailure;
  const hasFallback = getStepHasFallback(step);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  // The `fallback` Handle below is only mounted once `hasFallback` becomes
  // true — React Flow measures a node's handles once and doesn't notice ones
  // added later without a resize, so a freshly-added fallback edge fails to
  // resolve its source handle ("Couldn't create edge for source handle id:
  // fallback") until something else forces a re-measure. Telling React Flow
  // about the change here keeps the edge rendering immediately.
  //
  // React Flow already measures every node (handles included) when it mounts,
  // so the mount-time call is redundant — except when the fallback handle is
  // already present on mount, which is kept as a safety net.
  const updateNodeInternals = useUpdateNodeInternals();
  const hasRunInternalsEffectRef = useRef(false);
  useEffect(() => {
    const isFirstRun = !hasRunInternalsEffectRef.current;
    hasRunInternalsEffectRef.current = true;
    if (isFirstRun && !hasFallback) return;
    updateNodeInternals(node.id);
  }, [node.id, hasFallback, updateNodeInternals]);

  const isActive = node.selected;
  const [menu, setMenu] = useState<NodeMenuState>({ open: false });
  const isMenuOpen = menu.open;
  const { onStepRun, canRunSteps, renderStepIcon, onStepSelect, edit } = useWorkflowGraphActions();

  const execState = resolveExecutionState(stepExecution?.status);
  const colors = resolveNodeColors(euiTheme, stepType, isTriggerNode, execState);
  const borderRadius = NODE_BORDER_RADIUS;
  const chipBorderRadius = CHIP_BORDER_RADIUS;

  const canShowRun = Boolean(canRunSteps && onStepRun) && !isTrigger && !colors.hasStatusIcon;
  const isFallback = Boolean(fallbackOf);
  const nodeKind: NodeKind = isTriggerNode ? 'trigger' : isFallback ? 'fallback' : 'step';
  const editMode = edit !== undefined && !preview;
  const isIfNode = stepType === 'if';
  const portTargets = editMode ? nodePortTargets : undefined;
  // Hover / focus-within reveal is pure CSS (see the card styles); only
  // state-driven reveals re-render the card.
  const trailingReveal = isActive || isMenuOpen;
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
        chipBorderRadius={chipBorderRadius}
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
        aria-label={
          stepExecution?.status
            ? i18n.translate('workflowsUi.graphNode.ariaLabelWithStatus', {
                defaultMessage: '{stepType} step: {label}, status: {status}',
                values: { stepType, label: displayLabel, status: stepExecution.status },
              })
            : i18n.translate('workflowsUi.graphNode.ariaLabel', {
                defaultMessage: '{stepType} step: {label}',
                values: { stepType, label: displayLabel },
              })
        }
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
            // Hover / focus-within reveal is CSS-only so pointer movement never re-renders the card.
            [`&:hover > .${TRAILING_ACTIONS_CLASS}, &:focus-within > .${TRAILING_ACTIONS_CLASS}`]:
              TRAILING_ACTIONS_REVEALED,
            '&::after': selectionRingStyle(euiTheme, isActive),
          },
          nodeShadow,
          flash
            ? {
                [INSERT_FLASH_COLOR_VAR]: euiTheme.colors.backgroundLightPrimary,
                [euiCanAnimate]: {
                  animation: `${insertFlash} ${INSERT_FLASH_MS}ms ease-out`,
                },
              }
            : {},
        ]}
      >
        <NodeIconChip
          background={colors.chipBackground}
          border={colors.chipBorder}
          borderRadius={chipBorderRadius}
          useAiGradient={colors.chipUseAiGradient}
          fillRow
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
              ...nodeLabelTypography(euiTheme, '24px'),
              fontStyle: 'normal',
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

        {configWarningReason ? <NodeConfigWarningIndicator reason={configWarningReason} /> : null}

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
            className={TRAILING_ACTIONS_CLASS}
            css={{
              display: 'flex',
              alignItems: 'center',
              flex: '0 0 auto',
              overflow: 'hidden',
              ...(trailingReveal
                ? TRAILING_ACTIONS_REVEALED
                : {
                    gap: 0,
                    // Collapse out of the flex row at rest so the label can use the
                    // full card width. Negative start margin cancels the parent flex
                    // `gap` so a zero-width slot does not inflate the right inset.
                    marginInlineStart: `calc(-1 * ${euiTheme.size.m})`,
                    width: 0,
                    maxWidth: 0,
                    opacity: 0,
                    pointerEvents: 'none',
                  }),
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
        {editMode && edit && portTargets && (
          <WorkflowGraphConnectionPorts
            ports={portTargets}
            edit={edit}
            // Hover / focus-within reveal is CSS; keep the port revealed while a menu is open.
            nodeHovered={isMenuOpen}
            creatingError={creatingErrorPath}
            direction={layoutDirection}
          />
        )}
      </div>
      <NodeSourceHandles
        isIfNode={isIfNode}
        hasFallback={hasFallback}
        sourceHandlePos={sourceHandlePos}
        isHorizontal={isHorizontal}
      />
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
    prev.data.portTargets === next.data.portTargets &&
    prev.data.configWarning === next.data.configWarning &&
    prev.data.creatingErrorPath === next.data.creatingErrorPath &&
    prev.selected === next.selected &&
    prev.targetPosition === next.targetPosition &&
    prev.sourcePosition === next.sourcePosition &&
    prev.positionAbsoluteX === next.positionAbsoluteX &&
    prev.positionAbsoluteY === next.positionAbsoluteY
  );
}

export const WorkflowGraphNode = memo(WorkflowGraphNodeInner, nodePropsAreEqual);
