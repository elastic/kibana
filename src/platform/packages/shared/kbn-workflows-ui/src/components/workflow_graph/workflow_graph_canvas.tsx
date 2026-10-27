/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, euiCanAnimate, EuiText, transparentize, useEuiTheme } from '@elastic/eui';
import {
  Background,
  type ColorMode,
  type EdgeTypes,
  type NodeTypes,
  Panel,
  ReactFlow,
  type Viewport,
} from '@xyflow/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  LayoutDirection,
  TransformResult,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import {
  buildWorkflowSettingsNodes,
  type WorkflowSettingsNodesInput,
} from './build_settings_nodes';
import { CanvasMinimap, CanvasZoomControls, chromeAppearCss } from './canvas_chrome';
import { computeInsertionPoints } from './compute_insertion_points';
import { ensureWorkflowGraphEuiIcons } from './ensure_eui_icons';
import { GraphErrorBoundary } from './graph_error_boundary';
import { getMinimapNodeColor } from './minimap_node_color';
import type { PendingInsertVisual } from './pending_insert';
import { WORKFLOWS_CANVAS_CHROME_INSET } from './surface_radius';
import { useAppendStepShortcut } from './use_append_step_shortcut';
import { useCanvasViewport } from './use_canvas_viewport';
import { useDecoratedNodes } from './use_decorated_nodes';
import { useInsertLayoutAnimation } from './use_insert_layout_animation';
import { useWorkflowLayout } from './use_workflow_layout';
import {
  type NodeConfigWarningReason,
  type RenderStepIcon,
  type WorkflowGraphActions,
  WorkflowGraphActionsContext,
  type WorkflowGraphEditActions,
  type WorkflowSettingsNodeKind,
} from './workflow_graph_actions_context';
import { WorkflowGraphBypassLaneNode } from './workflow_graph_bypass_lane_node';
import { WorkflowGraphEdge } from './workflow_graph_edge';
import {
  WorkflowGraphEditOverlays,
  WorkflowGraphEmptyAddTrigger,
} from './workflow_graph_edit_overlays';
import { WorkflowGraphForeachGroupNode } from './workflow_graph_foreach_group_node';
import { WorkflowGraphNode } from './workflow_graph_node';
import { WorkflowGraphPendingNode } from './workflow_graph_pending_node';
import { WorkflowGraphSettingsGroupNode } from './workflow_graph_settings_group_node';
import { WorkflowGraphSettingsNode } from './workflow_graph_settings_node';

const NODE_TYPES: NodeTypes = {
  step: WorkflowGraphNode,
  trigger: WorkflowGraphNode,
  settings: WorkflowGraphSettingsNode,
  settingsGroup: WorkflowGraphSettingsGroupNode,
  foreachGroup: WorkflowGraphForeachGroupNode,
  bypassLane: WorkflowGraphBypassLaneNode,
};

// Resolved once: the platform never changes during a session.
const CMD_K_SHORTCUT_LABEL =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K';

const EDGE_TYPES: EdgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

export interface WorkflowGraphCanvasProps {
  readonly workflow: WorkflowYaml | undefined;
  /** Optional precomputed transform result for this workflow snapshot. */
  readonly transformed?: TransformResult;
  readonly stepExecutions?: WorkflowStepExecutionDto[];
  readonly isYamlValid: boolean;
  /** Optional UI rendered inside the ReactFlow canvas (e.g. top-left toolbar). */
  readonly toolbar?: React.ReactNode;
  readonly selectedStepId?: string;
  /**
   * When set, keep the selected node visible in the unobstructed canvas
   * (left of a floating config panel). Width in CSS px of that panel inset.
   */
  readonly selectedNodePanelInset?: number;
  readonly onStepSelect: (stepId: string | undefined) => void;
  readonly onNodeClick?: (stepId: string, stepType: string) => void;
  readonly onLayoutFailed?: (reason: string) => void;
  readonly onPerfMark?: (name: 'transform_ms' | 'layout_ms' | 'first_paint_ms', ms: number) => void;
  readonly colorMode?: ColorMode;
  /** Triggered by the hover "Run step" icon on a node. */
  readonly onStepRun?: (stepName: string) => void;
  /** Disables the per-node Run action when false. */
  readonly canRunSteps?: boolean;
  /**
   * Optional renderer for step icons. When provided the canvas delegates icon
   * resolution to the caller (e.g. plugin's `<StepIcon/>`) instead of the
   * built-in fallback table. Falls back gracefully when omitted.
   */
  readonly renderStepIcon?: RenderStepIcon;
  /** Dagre rank direction (default `'TB'`). */
  readonly direction?: LayoutDirection;
  /**
   * When true the viewport is fitted to show all nodes on init, overriding the
   * default centre-on-top behaviour.
   */
  readonly fitView?: boolean;
  /** Options forwarded to ReactFlow's fitView when `fitView` is true. */
  readonly fitViewOptions?: {
    readonly padding?: number;
    readonly minZoom?: number;
    readonly maxZoom?: number;
  };
  /** Whether to render the minimap. Pass false to suppress it (e.g. for exports). */
  readonly showMinimap?: boolean;
  /** Whether to render the floating zoom controls in the bottom-left corner. */
  readonly showZoomControls?: boolean;
  /**
   * Whether to render the dot-pattern background and the coloured wrapper div
   * background. Pass false for export canvases that need a transparent output.
   */
  readonly showBackground?: boolean;
  /**
   * Optional z-index applied to every edge. When omitted, React Flow stacks
   * edges with their connected nodes — including above foreach/while group
   * backgrounds for edges between child steps. Pass an explicit value (e.g. 0)
   * for off-screen export canvases that need a stable stacking context.
   */
  readonly edgeZIndex?: number;
  /**
   * Called once after ReactFlow has initialised and positioned the viewport
   * (including any fitView). Useful for off-screen export canvases that need
   * to know when the graph is ready to capture.
   */
  readonly onReady?: () => void;
  /**
   * When provided, ReactFlow uses this as the initial viewport instead of
   * running the default centering. Pair with `onViewportChange` to persist
   * the user's zoom/pan across canvas remounts (e.g. YAML↔graph toggle).
   */
  readonly defaultViewport?: Viewport;
  /**
   * Fires when the user finishes a pan or zoom gesture. The caller is
   * responsible for storing this so it can be passed back as
   * `defaultViewport` on the next mount.
   */
  readonly onViewportChange?: (viewport: Viewport) => void;
  /**
   * Edit-mode callbacks. When provided the canvas renders insertion controls,
   * node action clusters and the add-trigger affordances. Omit for read-only.
   */
  readonly edit?: WorkflowGraphEditActions;
  /**
   * Applied-state config warnings per node id (edit mode). Drives the
   * top-right warning badge and its tooltip copy.
   */
  readonly nodeConfigWarnings?: ReadonlyMap<string, NodeConfigWarningReason>;
  /** Node id to briefly highlight (just inserted); cleared by the caller. */
  readonly flashNodeId?: string;
  /** Ephemeral insert placeholder (empty while choosing, filled while configuring). */
  readonly pendingInsert?: PendingInsertVisual;
  /** Hide empty-state / trigger overlay insert controls (config panel is open). */
  readonly suppressInsertionControls?: boolean;
  /**
   * Optional empty-state overlay when the workflow has no triggers and no steps
   * in edit mode. When omitted, the default "Add trigger" card is shown.
   */
  readonly emptyState?: React.ReactNode;
  /**
   * When set, injects info / constants / outputs settings nodes one rank above
   * the triggers (same footprint and spacing as step/trigger nodes).
   */
  readonly settingsNodes?: WorkflowSettingsNodesInput;
  /** Opens / closes the settings panel when a settings node is activated. */
  readonly onSettingsNodeSelect?: (kind: WorkflowSettingsNodeKind | undefined) => void;
}

function WorkflowGraphCanvasInner(props: WorkflowGraphCanvasProps) {
  // Seed EUI icons before the first render of children (EuiIcon would otherwise
  // flash its loading placeholder). Idempotent; a lazy initializer runs once.
  useState(() => {
    ensureWorkflowGraphEuiIcons();
    return null;
  });
  const {
    workflow,
    transformed,
    stepExecutions,
    isYamlValid,
    toolbar,
    selectedStepId,
    selectedNodePanelInset,
    onStepSelect,
    onNodeClick,
    onLayoutFailed,
    onPerfMark,
    colorMode,
    onStepRun,
    canRunSteps,
    renderStepIcon,
    direction = 'TB',
    fitView: fitViewProp = false,
    fitViewOptions: fitViewOptionsProp,
    showMinimap = true,
    showZoomControls = false,
    showBackground = true,
    edgeZIndex,
    onReady,
    defaultViewport,
    onViewportChange,
    edit,
    nodeConfigWarnings,
    flashNodeId,
    pendingInsert,
    suppressInsertionControls,
    emptyState,
    settingsNodes,
    onSettingsNodeSelect,
  } = props;

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'workflowEdge' as const,
      ...(edgeZIndex !== undefined ? { zIndex: edgeZIndex } : {}),
    }),
    [edgeZIndex]
  );
  const { euiTheme } = useEuiTheme();
  // Readable grid texture so nodes lift off the canvas — keep dots soft so
  // they don't compete with graph chrome. `borderBaseProminent` at 40% alpha
  // holds in both color modes without a mode-specific branch.
  const backgroundDotColor = transparentize(euiTheme.colors.borderBaseProminent, 0.4);

  const {
    nodes: layoutNodes,
    edges: layoutEdges,
    transformed: graphTransform,
  } = useWorkflowLayout({
    workflow,
    transformed,
    stepExecutions,
    direction,
    onPerfMark,
    onLayoutFailed,
  });

  const nodes = useMemo(() => {
    if (!settingsNodes) return layoutNodes;
    const settingsRfNodes = buildWorkflowSettingsNodes(layoutNodes, direction, settingsNodes);
    return settingsRfNodes.length > 0 ? [...settingsRfNodes, ...layoutNodes] : layoutNodes;
  }, [layoutNodes, direction, settingsNodes]);

  // Node-anchored connection-point targets (edit mode mounts ports from these).
  const insertionPoints = useMemo(
    () => computeInsertionPoints(workflow, graphTransform),
    [workflow, graphTransform]
  );

  // Only stable, caller-supplied callbacks live in the context. Volatile
  // per-node values are written onto node `data` (see `nodesWithEditData`).
  const actions = useMemo<WorkflowGraphActions>(
    () => ({
      onStepRun,
      canRunSteps,
      renderStepIcon,
      onStepSelect,
      onSettingsNodeSelect,
      edit,
    }),
    [onStepRun, canRunSteps, renderStepIcon, onStepSelect, onSettingsNodeSelect, edit]
  );

  // First-paint mark: time from component mount, not from navigation start.
  const mountTimeRef = useRef(performance.now());
  const firstPaintRecorded = useRef(false);
  useEffect(() => {
    if (firstPaintRecorded.current) return;
    if (nodes.length === 0) return;
    firstPaintRecorded.current = true;
    requestAnimationFrame(() => {
      onPerfMark?.('first_paint_ms', performance.now() - mountTimeRef.current);
    });
  }, [nodes.length, onPerfMark]);

  const nodesWithEditData = useDecoratedNodes({
    nodes,
    insertionPoints,
    isEditMode: edit !== undefined,
    selectedStepId,
    selectedSettingsKind: settingsNodes?.selectedKind,
    nodeConfigWarnings,
    pendingInsert,
  });

  const { nodes: animatedNodes, edges: animatedEdges } = useInsertLayoutAnimation({
    nodes: nodesWithEditData,
    edges: layoutEdges,
    flashNodeId,
  });

  const handleNodeClick = useCallback(
    (
      _evt: React.MouseEvent,
      node: { id: string; type?: string; data: Record<string, unknown> }
    ) => {
      if (node.type === 'settings') {
        const kind = node.data?.kind;
        if (kind === 'info' || kind === 'constants' || kind === 'outputs') {
          onSettingsNodeSelect?.(kind);
        }
        return;
      }
      const stepType = typeof node.data?.stepType === 'string' ? node.data.stepType : '';
      onStepSelect(node.id);
      onNodeClick?.(node.id, stepType);
    },
    [onStepSelect, onNodeClick, onSettingsNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    if (selectedStepId) onStepSelect(undefined);
    if (settingsNodes?.selectedKind) onSettingsNodeSelect?.(undefined);
  }, [selectedStepId, onStepSelect, settingsNodes?.selectedKind, onSettingsNodeSelect]);

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => onViewportChange?.(viewport),
    [onViewportChange]
  );

  const hasWorkflowStructure =
    (workflow?.triggers?.length ?? 0) > 0 || (workflow?.steps?.length ?? 0) > 0;

  const panelFocusNodeId =
    selectedStepId ??
    (settingsNodes?.selectedKind ? `settings:${settingsNodes.selectedKind}` : undefined);
  const { wrapperRef, handleInit, handleResetView, handleFitView } = useCanvasViewport({
    nodes,
    direction,
    hasWorkflowStructure,
    fitView: fitViewProp,
    fitViewOptions: fitViewOptionsProp,
    defaultViewport,
    selectedNodePanelInset,
    panelFocusNodeId,
    onReady,
  });

  // ⌘K / Ctrl+K appends to the selected sequence (trunk when nothing selected).
  useAppendStepShortcut({ edit, suppressInsertionControls, insertionPoints, selectedStepId });

  // Nesting depth of each loop container (outermost = 1), from the `parentId`
  // chain of the stable layout output.
  const containerDepthById = useMemo(() => {
    const parentById = new Map(nodes.map((n) => [n.id, n.parentId]));
    const depths = new Map<string, number>();
    for (const n of nodes) {
      if (n.type === 'foreachGroup') {
        let depth = 1;
        for (let id = n.parentId; id !== undefined; id = parentById.get(id)) depth++;
        depths.set(n.id, depth);
      }
    }
    return depths;
  }, [nodes]);

  const minimapNodeColor = useCallback(
    (n: { id: string; type?: string; data?: unknown }) =>
      getMinimapNodeColor(
        n,
        {
          danger: euiTheme.colors.danger,
          success: euiTheme.colors.success,
          dangerText: euiTheme.colors.dangerText,
          accent: euiTheme.colors.accent,
          primary: euiTheme.colors.primary,
        },
        containerDepthById.get(n.id)
      ),
    [
      containerDepthById,
      euiTheme.colors.danger,
      euiTheme.colors.success,
      euiTheme.colors.dangerText,
      euiTheme.colors.accent,
      euiTheme.colors.primary,
    ]
  );

  const dimmed = !isYamlValid;
  // Zoom / minimap chrome stays available on the default empty canvas; pan waits
  // until the workflow has structure (no `panOnDrag`, so React Flow shows no grab cursor). Hide chrome entirely for the prototype
  // creation empty-state overlay, which owns the full viewport.
  const isEmptyWorkflow = edit !== undefined && !hasWorkflowStructure;
  const showNavChrome = hasWorkflowStructure || emptyState == null;
  const canPan = hasWorkflowStructure;
  const showZoomCluster = showNavChrome && showZoomControls;
  const showMinimapPanel = showNavChrome && showMinimap;

  return (
    <WorkflowGraphActionsContext.Provider value={actions}>
      <div
        ref={wrapperRef}
        css={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: showBackground ? euiTheme.colors.backgroundBaseSubdued : 'transparent',
        }}
        data-test-subj="workflowGraphCanvas"
      >
        {dimmed && (
          <div
            css={{
              position: 'absolute',
              top: euiTheme.size.s,
              left: euiTheme.size.s,
              right: euiTheme.size.s,
              zIndex: euiTheme.levels.header,
            }}
          >
            <EuiCallOut
              data-test-subj="workflowGraphYamlErrorCallout"
              announceOnMount
              size="s"
              iconType="warning"
              title={i18n.translate('workflowsUi.graph.invalidYaml', {
                defaultMessage: 'YAML has errors — fix to update graph',
              })}
              color="warning"
            />
          </div>
        )}
        <div
          css={{
            width: '100%',
            height: '100%',
            opacity: dimmed ? 0.5 : 1,
            pointerEvents: dimmed ? 'none' : 'auto',
            [euiCanAnimate]: { transition: 'opacity 200ms ease' },
          }}
        >
          <GraphErrorBoundary resetKeys={[workflow, transformed]} onError={onLayoutFailed}>
            <ReactFlow
              nodes={animatedNodes}
              edges={animatedEdges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              defaultEdgeOptions={defaultEdgeOptions}
              colorMode={colorMode}
              onInit={handleInit}
              fitView={fitViewProp}
              fitViewOptions={fitViewProp ? fitViewOptionsProp : undefined}
              defaultViewport={defaultViewport}
              onMoveEnd={handleMoveEnd}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              nodesDraggable={false}
              nodesConnectable={false}
              // Prevent React Flow from boosting a selected node's z-index above
              // its siblings / parent. Without this, selecting an inner step of
              // a foreach group lifts the (transparent) group body above the
              // outer edges that pass behind it, making those edges visible
              // through the body.
              elevateNodesOnSelect={false}
              elevateEdgesOnSelect={false}
              elementsSelectable
              panOnScroll={canPan}
              panOnDrag={canPan}
              zoomOnScroll={false}
              zoomOnPinch={showNavChrome}
              zoomOnDoubleClick={false}
              minZoom={0.1}
            >
              {showBackground && (
                <Background
                  bgColor={euiTheme.colors.backgroundBaseSubdued}
                  color={backgroundDotColor}
                  gap={16}
                  size={1.25}
                />
              )}
              {toolbar}
              {showZoomCluster && (
                <Panel position="bottom-left" style={{ margin: WORKFLOWS_CANVAS_CHROME_INSET }}>
                  <div css={chromeAppearCss} data-test-subj="workflowCanvas-navChrome-zoom">
                    <CanvasZoomControls onResetView={handleResetView} onFitView={handleFitView} />
                  </div>
                </Panel>
              )}
              {showMinimapPanel && (
                <Panel position="bottom-right" style={{ margin: WORKFLOWS_CANVAS_CHROME_INSET }}>
                  <div css={chromeAppearCss} data-test-subj="workflowCanvas-navChrome-minimap">
                    <CanvasMinimap nodeColor={minimapNodeColor} />
                  </div>
                </Panel>
              )}
              {!isEmptyWorkflow && edit && !suppressInsertionControls && (
                <WorkflowGraphEditOverlays
                  nodes={animatedNodes}
                  edges={animatedEdges}
                  insertionPoints={insertionPoints}
                  direction={direction}
                  edit={edit}
                  forkNodeToJoinId={graphTransform.forkNodeToJoinId}
                />
              )}
              {edit && !suppressInsertionControls && !isEmptyWorkflow && (
                <Panel position="bottom-center" style={{ marginBottom: euiTheme.size.s }}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="workflowGraphCmdKCaption"
                    css={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {i18n.translate('workflowsUi.graph.cmdKCaption', {
                      defaultMessage: '{shortcut} to add a step',
                      values: { shortcut: CMD_K_SHORTCUT_LABEL },
                    })}
                  </EuiText>
                </Panel>
              )}
              {edit && pendingInsert && (
                <WorkflowGraphPendingNode
                  pending={pendingInsert}
                  nodes={nodes}
                  insertionPoints={insertionPoints}
                  direction={direction}
                />
              )}
            </ReactFlow>
          </GraphErrorBoundary>
          {edit &&
            isEmptyWorkflow &&
            !pendingInsert &&
            (emptyState ?? <WorkflowGraphEmptyAddTrigger edit={edit} />)}
        </div>
      </div>
    </WorkflowGraphActionsContext.Provider>
  );
}

/**
 * Inner version of the canvas — does NOT wrap itself in a `ReactFlowProvider`.
 * Use when a parent provides the provider (e.g. so sibling components like
 * the floating bottom bar can `useReactFlow()` against the same flow).
 */
export const WorkflowGraphCanvasWithoutProvider = WorkflowGraphCanvasInner;
