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
  EuiCallOut,
  euiCanAnimate,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { keyframes } from '@emotion/react';
import {
  Background,
  type ColorMode,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  ReactFlow,
  type ReactFlowInstance,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Viewport,
} from '@xyflow/react';
import React, {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { i18n } from '@kbn/i18n';
import type {
  LayoutDirection,
  TransformResult,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';
import { TRIGGER_STEP_TYPES } from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import './ensure_eui_icons';
import {
  buildWorkflowSettingsNodes,
  type WorkflowSettingsNodesInput,
} from './build_settings_nodes';
import { computeInsertionPoints } from './compute_insertion_points';
import { computePendingErrorBranchPlacement, type PendingInsertVisual } from './pending_insert';
import { resolveAppendInsertTarget } from './resolve_append_insert_target';
import { WORKFLOWS_CANVAS_CHROME_INSET, WORKFLOWS_SURFACE_RADIUS } from './surface_radius';
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
import { WorkflowSettingsPanel } from './workflow_graph_poc_toggles';
import { WorkflowGraphSettingsGroupNode } from './workflow_graph_settings_group_node';
import { WorkflowGraphSettingsNode } from './workflow_graph_settings_node';

/** Subtle entrance when navigation chrome appears after the creation state. */
const chromeAppear = keyframes({
  '0%': { opacity: 0, transform: 'scale(0.96)' },
  '100%': { opacity: 1, transform: 'scale(1)' },
});

const chromeAppearCss = {
  [euiCanAnimate]: {
    animation: `${chromeAppear} 180ms ease-out`,
  },
};

interface GraphErrorBoundaryState {
  error: Error | null;
}

class GraphErrorBoundary extends Component<
  { children: ReactNode; onError?: (msg: string) => void },
  GraphErrorBoundaryState
> {
  state: GraphErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GraphErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.error) {
      return (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('workflowsUi.graph.renderErrorTitle', {
            defaultMessage: 'Workflow graph could not be displayed',
          })}
          color="danger"
          iconType="error"
        >
          <p>{this.state.error.message}</p>
        </EuiCallOut>
      );
    }
    return this.props.children;
  }
}

const NODE_TYPES: NodeTypes = {
  step: WorkflowGraphNode,
  trigger: WorkflowGraphNode,
  settings: WorkflowGraphSettingsNode,
  settingsGroup: WorkflowGraphSettingsGroupNode,
  foreachGroup: WorkflowGraphForeachGroupNode,
  bypassLane: WorkflowGraphBypassLaneNode,
};

const EDGE_TYPES: EdgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

// Predefined zoom for the initial graph view; user can zoom in/out from
// the bar afterwards. Picked to match the readability shown in the design.
const INITIAL_ZOOM = 1;
const TOP_PADDING = 80;

interface GraphBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centerX: number;
  readonly centerY: number;
}

/**
 * Returns the `setCenter` target (x, y) for the initial / reset view.
 *
 * The framing is axis-aware: for `TB` (vertical) the trigger row is the topmost
 * rank so we anchor it near the top edge — `minY` is placed `TOP_PADDING` pixels
 * from the top, and the graph is centred horizontally (`centerX`). For `LR`
 * (horizontal) the trigger column is the leftmost rank, so we mirror the framing:
 * `minX` is anchored `TOP_PADDING` pixels from the left edge, and the graph is
 * centred vertically (`centerY`). Both axes use the same `TOP_PADDING` constant.
 *
 * Callers should pass bounds for the *leading rank* (triggers), not the full
 * graph AABB — otherwise wide branches pull the triggers off-center.
 */
const getResetViewTarget = (
  direction: LayoutDirection,
  bounds: Pick<GraphBounds, 'minX' | 'minY' | 'centerX' | 'centerY'>,
  wrapperWidth: number,
  wrapperHeight: number,
  topPadding: number = TOP_PADDING
): { x: number; y: number } =>
  direction === 'LR'
    ? { x: bounds.minX + wrapperWidth / 2 - topPadding, y: bounds.centerY }
    : { x: bounds.centerX, y: bounds.minY + wrapperHeight / 2 - topPadding };

const boundsFromNodes = (nodes: readonly Node[]): GraphBounds | undefined => {
  // Parent-relative child positions are not canvas-absolute — only top-level
  // nodes (and compound parents) contribute to the AABB.
  const topLevel = nodes.filter((n) => !n.parentId);
  if (topLevel.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of topLevel) {
    const w = typeof n.width === 'number' ? n.width : 300;
    const h = typeof n.height === 'number' ? n.height : 56;
    if (n.position.x < minX) minX = n.position.x;
    if (n.position.y < minY) minY = n.position.y;
    if (n.position.x + w > maxX) maxX = n.position.x + w;
    if (n.position.y + h > maxY) maxY = n.position.y + h;
  }
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
};

/**
 * Home framing uses the trigger row/column so wide downstream branches do not
 * shift triggers away from the center-top (TB) / center-left (LR) landing.
 * Falls back to the full graph when there are no triggers yet.
 */
const getHomeFrameBounds = (
  nodes: readonly Node[],
  fallback: GraphBounds
): GraphBounds => {
  // Frame the leading rank: settings (when present) + triggers so the home
  // view keeps both rows in view under TOP_PADDING.
  // Prefer the settings group (absolute) over child cards (parent-relative).
  const leading = nodes.filter((n) => n.type === 'trigger' || n.type === 'settingsGroup');
  return boundsFromNodes(leading.length > 0 ? leading : nodes) ?? fallback;
};

function CanvasZoomControls({
  onResetView,
  onFitView,
}: {
  onResetView: () => void;
  onFitView: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const floatingShadow = useEuiShadow('m');
  const { zoomIn, zoomOut } = useReactFlow();

  const zoomOutLabel = i18n.translate('workflowsUi.graph.zoomOut', {
    defaultMessage: 'Zoom out',
  });
  const zoomInLabel = i18n.translate('workflowsUi.graph.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const resetZoomLabel = i18n.translate('workflowsUi.graph.resetZoom', {
    defaultMessage: 'Reset zoom',
  });
  const fitViewLabel = i18n.translate('workflowsUi.graph.fitView', {
    defaultMessage: 'Fit to view',
  });

  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);

  return (
    <div
      css={[
        {
          background: euiTheme.colors.backgroundBasePlain,
          borderRadius: WORKFLOWS_SURFACE_RADIUS,
          display: 'flex',
          flexDirection: 'column',
          padding: euiTheme.size.s,
          gap: 2,
          position: 'relative',
        },
        floatingShadow,
      ]}
    >
      <EuiToolTip content={zoomInLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="plus"
          aria-label={zoomInLabel}
          color="text"
          size="s"
          onClick={handleZoomIn}
          data-test-subj="workflowCanvas-zoom-in"
        />
      </EuiToolTip>
      <EuiToolTip content={zoomOutLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="minus"
          aria-label={zoomOutLabel}
          color="text"
          size="s"
          onClick={handleZoomOut}
          data-test-subj="workflowCanvas-zoom-out"
        />
      </EuiToolTip>
      <EuiToolTip content={resetZoomLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="bullseye"
          aria-label={resetZoomLabel}
          color="text"
          size="s"
          onClick={onResetView}
          data-test-subj="workflowCanvas-reset-zoom"
        />
      </EuiToolTip>
      <EuiToolTip content={fitViewLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="fullScreen"
          aria-label={fitViewLabel}
          color="text"
          size="s"
          onClick={onFitView}
          data-test-subj="workflowCanvas-fit-view"
        />
      </EuiToolTip>
    </div>
  );
}

function CanvasMinimap({
  nodeColor,
}: {
  nodeColor: (n: { type?: string; data?: unknown }) => string;
}) {
  const { euiTheme } = useEuiTheme();
  // Keep the shadow mixin's dark-mode ::after ring off this wrapper; that
  // overlay sits at z-index 0 and the MiniMap paints over it, so the border
  // would only show around the collapse header.
  const floatingShadow = useEuiShadow('m', { border: 'none' });
  const [isExpanded, setIsExpanded] = useState(true);

  const collapseLabel = i18n.translate('workflowsUi.graph.collapseMinimapAriaLabel', {
    defaultMessage: 'Collapse minimap',
  });
  const expandLabel = i18n.translate('workflowsUi.graph.expandMinimapAriaLabel', {
    defaultMessage: 'Expand minimap',
  });

  if (!isExpanded) {
    return (
      <div
        css={[
          {
            background: euiTheme.colors.backgroundBasePlain,
            borderRadius: WORKFLOWS_SURFACE_RADIUS,
            border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
            padding: euiTheme.size.s,
            position: 'relative',
          },
          floatingShadow,
        ]}
      >
        <EuiToolTip content={expandLabel} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="map"
            aria-label={expandLabel}
            color="text"
            size="s"
            onClick={() => setIsExpanded(true)}
            data-test-subj="workflowCanvas-expand-minimap"
          />
        </EuiToolTip>
      </div>
    );
  }

  return (
    <div
      css={[
        {
          position: 'relative',
          borderRadius: WORKFLOWS_SURFACE_RADIUS,
          background: euiTheme.colors.emptyShade,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          overflow: 'hidden',
          '& .react-flow__minimap.react-flow__panel': {
            position: 'relative',
            inset: 'auto',
            margin: 0,
            transform: 'none',
          },
          '& .react-flow__minimap-svg': {
            margin: 4,
            width: 'calc(100% - 8px)',
            height: 'calc(100% - 8px)',
          },
        },
        floatingShadow,
      ]}
    >
      <div
        css={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: euiTheme.size.s,
        }}
      >
        <EuiToolTip content={collapseLabel} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minus"
            aria-label={collapseLabel}
            color="text"
            size="xs"
            onClick={() => setIsExpanded(false)}
            data-test-subj="workflowCanvas-collapse-minimap"
          />
        </EuiToolTip>
      </div>
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        bgColor={euiTheme.colors.backgroundBaseSubdued}
        maskColor={transparentize(euiTheme.colors.backgroundBaseSubdued, 0.7)}
        nodeColor={nodeColor}
        nodeStrokeWidth={0}
        nodeBorderRadius={2}
        style={{
          width: 160,
          height: 126,
          boxSizing: 'border-box',
          background: euiTheme.colors.emptyShade,
        }}
      />
    </div>
  );
}

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

  const actions = useMemo<WorkflowGraphActions>(
    () => ({
      onStepRun,
      canRunSteps,
      renderStepIcon,
      onStepSelect,
      onSettingsNodeSelect,
      edit,
      nodeConfigWarnings,
      // Ports stay mounted while the config/YAML panel is open; suppress only
      // applies to the empty-state / trigger overlay controls below.
      portTargetsByNodeId: edit ? insertionPoints.byNodeId : undefined,
      pendingInsert: edit ? pendingInsert : undefined,
    }),
    [
      onStepRun,
      canRunSteps,
      renderStepIcon,
      onStepSelect,
      onSettingsNodeSelect,
      edit,
      nodeConfigWarnings,
      insertionPoints.byNodeId,
      pendingInsert,
    ]
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

  // Decorate nodes with selection / flash, and temporarily shift rows when an
  // error-path placeholder needs a lane inserted (same algorithm as committed layout).
  const pendingErrorPlacement = useMemo(() => {
    if (!edit || !pendingInsert || pendingInsert.context.mode !== 'error') return undefined;
    return computePendingErrorBranchPlacement(
      pendingInsert.context.stepId,
      nodes,
      direction
    );
  }, [edit, pendingInsert, nodes, direction]);

  const nodesWithPendingLane = useMemo(() => {
    const shifts = pendingErrorPlacement?.shifts;
    if (!shifts || shifts.size === 0) return nodes;
    return nodes.map((n) => {
      const s = shifts.get(n.id);
      if (!s || (s.dx === 0 && s.dy === 0)) return n;
      return {
        ...n,
        position: { x: n.position.x + s.dx, y: n.position.y + s.dy },
      };
    });
  }, [nodes, pendingErrorPlacement]);

  const decoratedNodes = useMemo(() => {
    const settingsSelectedId = settingsNodes?.selectedKind
      ? `settings:${settingsNodes.selectedKind}`
      : undefined;
    if (!selectedStepId && !settingsSelectedId) return nodesWithPendingLane;
    return nodesWithPendingLane.map((n) => {
      const selected =
        (selectedStepId != null && n.id === selectedStepId) ||
        (settingsSelectedId != null && n.id === settingsSelectedId);
      if (!selected && !n.selected) return n;
      return {
        ...n,
        selected,
      };
    });
  }, [nodesWithPendingLane, selectedStepId, settingsNodes?.selectedKind]);

  const {
    nodes: animatedNodes,
    edges: animatedEdges,
  } = useInsertLayoutAnimation({
    nodes: decoratedNodes,
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

  // Single-pass bounding-box over the stable layout output (`nodes`, not
  // `decoratedNodes`) so that selection changes never invalidate fit/reset
  // viewport callbacks. `Math.min/max(...arr.map(...))` is avoided: spreading
  // large arrays as call args can raise RangeError on very big graphs.
  const graphBounds = useMemo((): GraphBounds => {
    return (
      boundsFromNodes(nodes) ?? {
        minX: -1000,
        minY: -1000,
        maxX: 1000,
        maxY: 1000,
        centerX: 0,
        centerY: 0,
      }
    );
  }, [nodes]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Keep the selected node visible beside a floating config panel (right inset).
  const panelFocusNodeId =
    selectedStepId ??
    (settingsNodes?.selectedKind ? `settings:${settingsNodes.selectedKind}` : undefined);
  useEffect(() => {
    if (!panelFocusNodeId || !selectedNodePanelInset || selectedNodePanelInset <= 0) return;
    const instance = flowInstanceRef.current;
    if (!instance) return;
    const node = instance.getNode(panelFocusNodeId);
    if (!node) return;
    const zoom = instance.getZoom();
    const w = node.measured?.width ?? (node.width as number | undefined) ?? 200;
    const h = node.measured?.height ?? (node.height as number | undefined) ?? 80;
    const centerX = node.position.x + w / 2;
    const centerY = node.position.y + h / 2;
    // Shift the viewport center so the node sits in the unobstructed left region.
    const panelFlowOffset = selectedNodePanelInset / (2 * zoom);
    instance.setCenter(centerX + panelFlowOffset, centerY, { zoom, duration: 220 });
  }, [panelFocusNodeId, selectedNodePanelInset]);

  // React Flow's `setCenter` derives the viewport from the store's container
  // `width`/`height`, which are 0 until its ResizeObserver measures the canvas
  // (usually *after* `onInit` fires). Subscribe to those measured dimensions so
  // the initial centering can wait until they are known.
  const measuredWidth = useStore((s) => s.width);
  const measuredHeight = useStore((s) => s.height);
  const nodesInitialized = useNodesInitialized();
  const hasCenteredInitialViewRef = useRef(false);
  const [instanceReady, setInstanceReady] = useState(false);
  /**
   * When true, keep applying the home frame through panel-close / canvas resize
   * after the first trigger or step is added to an empty workflow.
   */
  const homeAfterFirstStructureRef = useRef(false);
  const hadWorkflowStructureRef = useRef(
    (workflow?.triggers?.length ?? 0) > 0 || (workflow?.steps?.length ?? 0) > 0
  );

  const hasWorkflowStructure =
    (workflow?.triggers?.length ?? 0) > 0 || (workflow?.steps?.length ?? 0) > 0;

  // Single home-viewport implementation shared by initial centering, direction
  // changes, and the Reset zoom button. Frames the trigger rank at center-top
  // (TB) / center-left (LR) — see getHomeFrameBounds + getResetViewTarget.
  const applyHomeViewport = useCallback(
    (instance: ReactFlowInstance, duration: number) => {
      if (nodes.length === 0) return;
      // Prefer React Flow's measured store size (what setCenter uses) over the
      // wrapper ref — they can diverge briefly during fade-in mounts.
      const wrapperWidth = measuredWidth || wrapperRef.current?.clientWidth || 0;
      const wrapperHeight = measuredHeight || wrapperRef.current?.clientHeight || 0;
      const homeBounds = getHomeFrameBounds(nodes, graphBounds);
      const target = getResetViewTarget(direction, homeBounds, wrapperWidth, wrapperHeight);
      instance.setCenter(target.x, target.y, { zoom: INITIAL_ZOOM, duration });
    },
    [nodes, graphBounds, direction, measuredWidth, measuredHeight]
  );

  /**
   * True viewport center on the leading nodes — matches the empty-canvas draft
   * placement so the first saved trigger does not jump up to the home-frame top.
   */
  const applyCenteredViewport = useCallback(
    (instance: ReactFlowInstance, duration: number) => {
      if (nodes.length === 0) return;
      const homeBounds = getHomeFrameBounds(nodes, graphBounds);
      instance.setCenter(homeBounds.centerX, homeBounds.centerY, {
        zoom: INITIAL_ZOOM,
        duration,
      });
    },
    [nodes, graphBounds]
  );

  const handleResetView = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance) return;
    applyHomeViewport(instance, 200);
  }, [applyHomeViewport]);

  // Scales and pans the viewport to show every node. Uses fitBounds (direct
  // panZoom.setViewport call) rather than fitView (queued through BatchProvider +
  // React re-render cycle) so the viewport updates synchronously without any
  // interference from the outer ReactFlowProvider context.
  const handleFitView = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) return;

    instance.fitBounds(
      {
        x: graphBounds.minX,
        y: graphBounds.minY,
        width: graphBounds.maxX - graphBounds.minX,
        height: graphBounds.maxY - graphBounds.minY,
      },
      { duration: 200, padding: 0.08 }
    );
  }, [nodes.length, graphBounds]);

  // Record the instance and decide who owns the initial viewport. The default
  // centering is deferred to the measurement-gated effect below, because
  // `setCenter` needs the container dimensions React Flow has not measured yet
  // when `onInit` fires.
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowInstanceRef.current = instance;

      // When fitView is declarative (fitViewProp=true), ReactFlow handles the
      // viewport positioning internally before firing onInit. Just signal ready.
      if (fitViewProp) {
        hasCenteredInitialViewRef.current = true;
        onReady?.();
        return;
      }

      // If the caller supplied a `defaultViewport`, React Flow has already
      // restored the user's previous zoom/pan — don't re-center over it.
      // (The store doesn't survive a remount of <ReactFlow>, so we can't
      // detect this from `instance.getViewport()`; the explicit prop is the
      // only reliable signal.)
      if (defaultViewport) {
        hasCenteredInitialViewRef.current = true;
        onReady?.();
        return;
      }

      setInstanceReady(true);
    },
    [defaultViewport, fitViewProp, onReady]
  );

  // Tracks whether we've ever seen an empty canvas this mount. Used so page-load
  // with existing structure still uses the Reset-zoom home frame, while empty →
  // first trigger uses true-center (matching the draft card).
  const sawEmptyCanvasRef = useRef(false);

  // Empty ↔ first trigger/step: arm a short centering window so we keep the
  // node where the draft sat (viewport center) after the config panel closes.
  useEffect(() => {
    if (!hasWorkflowStructure) {
      hasCenteredInitialViewRef.current = false;
      homeAfterFirstStructureRef.current = false;
      hadWorkflowStructureRef.current = false;
      sawEmptyCanvasRef.current = true;
      return;
    }
    if (sawEmptyCanvasRef.current && !hadWorkflowStructureRef.current) {
      homeAfterFirstStructureRef.current = true;
    }
  }, [hasWorkflowStructure]);

  // Empty → first structure: keep the node in the viewport center (same place as
  // the draft card). Do not use the Reset-zoom home frame here — that anchors
  // near the top and makes the first trigger jump up on save.
  useLayoutEffect(() => {
    if (!homeAfterFirstStructureRef.current || !instanceReady) {
      return;
    }
    if (selectedNodePanelInset && selectedNodePanelInset > 0) {
      return;
    }
    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) {
      return;
    }
    if (measuredWidth <= 0 || measuredHeight <= 0) {
      return;
    }

    hadWorkflowStructureRef.current = true;
    hasCenteredInitialViewRef.current = true;
    applyCenteredViewport(instance, 0);
    onReady?.();
  }, [
    instanceReady,
    measuredWidth,
    measuredHeight,
    nodes.length,
    nodes,
    selectedNodePanelInset,
    applyCenteredViewport,
    onReady,
    hasWorkflowStructure,
  ]);

  // Re-center briefly after first structure so a late canvas resize (config panel
  // closing) does not shift the node away from where the draft was.
  useEffect(() => {
    if (!homeAfterFirstStructureRef.current) return undefined;
    if (selectedNodePanelInset && selectedNodePanelInset > 0) return undefined;
    if (!instanceReady || nodes.length === 0 || measuredWidth <= 0 || measuredHeight <= 0) {
      return undefined;
    }
    const instance = flowInstanceRef.current;
    if (!instance) return undefined;

    applyCenteredViewport(instance, 0);
    const settleTimer = setTimeout(() => {
      applyCenteredViewport(instance, 0);
      homeAfterFirstStructureRef.current = false;
    }, 400);
    return () => clearTimeout(settleTimer);
  }, [
    instanceReady,
    measuredWidth,
    measuredHeight,
    nodes.length,
    selectedNodePanelInset,
    applyCenteredViewport,
    hasWorkflowStructure,
  ]);

  // Perform the one-time initial centering when the page loads with structure
  // already present. Empty → first structure is handled above.
  useEffect(() => {
    if (homeAfterFirstStructureRef.current) {
      return;
    }
    if (hasCenteredInitialViewRef.current || !instanceReady) {
      return;
    }
    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) {
      return;
    }
    if (measuredWidth <= 0 || measuredHeight <= 0 || !nodesInitialized) {
      return;
    }

    hasCenteredInitialViewRef.current = true;
    hadWorkflowStructureRef.current = hasWorkflowStructure;
    applyHomeViewport(instance, 0);
    onReady?.();
  }, [
    instanceReady,
    measuredWidth,
    measuredHeight,
    nodesInitialized,
    nodes.length,
    applyHomeViewport,
    onReady,
    hasWorkflowStructure,
  ]);

  // ⌘K / Ctrl+K appends to the selected sequence (trunk when nothing selected).
  useEffect(() => {
    if (!edit || suppressInsertionControls) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      // Ignore when typing in inputs / Monaco.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('.monaco-editor'))
      ) {
        return;
      }
      const insertContext = resolveAppendInsertTarget(insertionPoints, selectedStepId);
      if (!insertContext) return;
      event.preventDefault();
      edit.onInsert(insertContext, { left: 0, top: 0, width: 0, height: 0 });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [edit, suppressInsertionControls, insertionPoints, selectedStepId]);

  const previousDirectionRef = useRef(direction);
  useEffect(() => {
    if (previousDirectionRef.current === direction) {
      return;
    }
    previousDirectionRef.current = direction;

    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) {
      return;
    }

    // Wait for dagre positions to commit in React Flow before re-centering.
    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (fitViewProp) {
          void instance.fitView({
            padding: fitViewOptionsProp?.padding ?? 0.08,
            minZoom: fitViewOptionsProp?.minZoom ?? 0.2,
            maxZoom: fitViewOptionsProp?.maxZoom ?? 2,
            duration: 200,
          });
        } else {
          applyHomeViewport(instance, 200);
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) {
        cancelAnimationFrame(raf2);
      }
    };
  }, [direction, nodes.length, fitViewProp, fitViewOptionsProp, applyHomeViewport]);

  const minimapNodeColor = useCallback(
    (n: { type?: string; data?: unknown }) => {
      // Placeholder nodes for empty `if` branches are invisible — hide them in
      // the minimap too so they don't appear as spurious coloured dots.
      if (n.type === 'bypassLane') return 'transparent';
      const data = n.data as
        | {
            stepExecution?: { status?: string };
            isTrigger?: boolean;
            stepType?: string;
            fallbackOf?: string;
          }
        | undefined;
      const status = data?.stepExecution?.status;
      if (status === 'failed') return euiTheme.colors.danger;
      if (status === 'completed') return euiTheme.colors.success;
      // Fallback-lane nodes that have not yet failed render in a lighter-danger
      // tint so they read as "the error path" without impersonating a failed step.
      // The `status === 'failed'` arm above takes priority, so a fallback step
      // that really failed still reads as full danger.
      if (data?.fallbackOf !== undefined) return euiTheme.colors.dangerText;
      // Figma (node 10808:19179): the trigger node reads as pink (accent) in the
      // minimap, matching its icon accent; all other steps are blue (primary).
      // Tokens keep the light look (#0b64dd / #ee72a6) and adapt in dark mode.
      const isTriggerNode =
        data?.isTrigger || (data?.stepType ? TRIGGER_STEP_TYPES.has(data.stepType) : false);
      return isTriggerNode ? euiTheme.colors.accent : euiTheme.colors.primary;
    },
    [
      euiTheme.colors.danger,
      euiTheme.colors.success,
      euiTheme.colors.dangerText,
      euiTheme.colors.accent,
      euiTheme.colors.primary,
    ]
  );

  const dimmed = !isYamlValid;
  // Zoom / minimap chrome stays available on the default empty canvas; pan waits
  // until the workflow has structure. Hide chrome entirely for the prototype
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
          // Empty canvas: static backdrop — no grab affordance until structure exists.
          ...(!canPan
            ? {
                '& .react-flow__pane': {
                  cursor: 'default',
                },
              }
            : {}),
        }}
        data-test-subj="workflowGraphCanvas"
      >
        {dimmed && (
          <div
            css={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
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
            transition: 'opacity 200ms ease',
          }}
        >
          <GraphErrorBoundary onError={onLayoutFailed}>
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
              {edit && (
                <Panel position="top-right" style={{ margin: CORNER_CONTROLS_INSET }}>
                  <WorkflowSettingsPanel />
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
                <Panel position="bottom-center" style={{ marginBottom: 8 }}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="workflowGraphCmdKCaption"
                    css={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {i18n.translate('workflowsUi.graph.cmdKCaption', {
                      defaultMessage: '{shortcut} to add a step',
                      values: {
                        shortcut:
                          typeof navigator !== 'undefined' &&
                          /Mac|iPhone|iPad/.test(navigator.platform)
                            ? '⌘K'
                            : 'Ctrl+K',
                      },
                    })}
                  </EuiText>
                </Panel>
              )}
              {edit && pendingInsert && (
                <WorkflowGraphPendingNode
                  pending={pendingInsert}
                  nodes={nodesWithPendingLane}
                  insertionPoints={insertionPoints}
                  direction={direction}
                />
              )}
            </ReactFlow>
          </GraphErrorBoundary>
          {edit && isEmptyWorkflow && !pendingInsert && (emptyState ?? <WorkflowGraphEmptyAddTrigger edit={edit} />)}
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
