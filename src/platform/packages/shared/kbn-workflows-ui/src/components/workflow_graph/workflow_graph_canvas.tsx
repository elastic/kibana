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
import { computeInsertionPoints } from './compute_insertion_points';
import { computePendingErrorBranchPlacement, type PendingInsertVisual } from './pending_insert';
import { useInsertLayoutAnimation } from './use_insert_layout_animation';
import { useWorkflowLayout } from './use_workflow_layout';
import {
  type RenderStepIcon,
  type WorkflowGraphActions,
  WorkflowGraphActionsContext,
  type WorkflowGraphEditActions,
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
  wrapperHeight: number
): { x: number; y: number } =>
  direction === 'LR'
    ? { x: bounds.minX + wrapperWidth / 2 - TOP_PADDING, y: bounds.centerY }
    : { x: bounds.centerX, y: bounds.minY + wrapperHeight / 2 - TOP_PADDING };

const boundsFromNodes = (nodes: readonly Node[]): GraphBounds | undefined => {
  if (nodes.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const w = typeof n.width === 'number' ? n.width : 300;
    const h = typeof n.height === 'number' ? n.height : 64;
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
  const triggers = nodes.filter((n) => n.type === 'trigger');
  return boundsFromNodes(triggers.length > 0 ? triggers : nodes) ?? fallback;
};

const CORNER_CONTROLS_INSET = 12;

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
          borderRadius: euiTheme.border.radius.small,
          display: 'flex',
          flexDirection: 'column',
          padding: 4,
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
            borderRadius: euiTheme.border.radius.small,
            border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
            padding: 4,
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
          borderRadius: euiTheme.border.radius.small,
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
          paddingTop: 4,
          paddingRight: 4,
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
  /** Node ids whose step is missing a schema-required field (edit mode). */
  readonly incompleteNodeIds?: ReadonlySet<string>;
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
}

function WorkflowGraphCanvasInner(props: WorkflowGraphCanvasProps) {
  const {
    workflow,
    transformed,
    stepExecutions,
    isYamlValid,
    toolbar,
    selectedStepId,
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
    incompleteNodeIds,
    flashNodeId,
    pendingInsert,
    suppressInsertionControls,
    emptyState,
  } = props;

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'workflowEdge' as const,
      ...(edgeZIndex !== undefined ? { zIndex: edgeZIndex } : {}),
    }),
    [edgeZIndex]
  );
  const { euiTheme } = useEuiTheme();
  // Match design mockups: denser, higher-contrast dots that still read as texture
  // (not ink) in both color modes — no mode-specific branch.
  const backgroundDotColor = transparentize(euiTheme.colors.borderBaseProminent, 0.75);

  const {
    nodes,
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
      edit,
      incompleteNodeIds,
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
      edit,
      incompleteNodeIds,
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
    if (!selectedStepId) return nodesWithPendingLane;
    return nodesWithPendingLane.map((n) => {
      if (n.id !== selectedStepId) return n;
      return {
        ...n,
        selected: true,
      };
    });
  }, [nodesWithPendingLane, selectedStepId]);

  const {
    nodes: animatedNodes,
    edges: animatedEdges,
  } = useInsertLayoutAnimation({
    nodes: decoratedNodes,
    edges: layoutEdges,
    flashNodeId,
  });

  const handleNodeClick = useCallback(
    (_evt: React.MouseEvent, node: { id: string; data: Record<string, unknown> }) => {
      const stepType = typeof node.data?.stepType === 'string' ? node.data.stepType : '';
      onStepSelect(node.id);
      onNodeClick?.(node.id, stepType);
    },
    [onStepSelect, onNodeClick]
  );

  const handlePaneClick = useCallback(() => {
    if (selectedStepId) onStepSelect(undefined);
  }, [selectedStepId, onStepSelect]);

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => onViewportChange?.(viewport),
    [onViewportChange]
  );

  // Single-pass bounding-box over the stable layout output (`nodes`, not
  // `decoratedNodes`) so that selection changes never invalidate the extent
  // or reset-viewport callbacks.  `Math.min/max(...arr.map(...))` is avoided:
  // spreading large arrays as call args can raise RangeError on very big graphs.
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

  // Restrict panning to the graph's bounding box plus a comfortable margin
  // so the user can't scroll far off into empty space.
  const translateExtent = useMemo<[[number, number], [number, number]]>(() => {
    const PAD = 400;
    return [
      [graphBounds.minX - PAD, graphBounds.minY - PAD],
      [graphBounds.maxX + PAD, graphBounds.maxY + PAD],
    ];
  }, [graphBounds]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // React Flow's `setCenter` derives the viewport from the store's container
  // `width`/`height`, which are 0 until its ResizeObserver measures the canvas
  // (usually *after* `onInit` fires). Subscribe to those measured dimensions so
  // the initial centering can wait until they are known.
  const measuredWidth = useStore((s) => s.width);
  const measuredHeight = useStore((s) => s.height);
  const nodesInitialized = useNodesInitialized();
  const hasCenteredInitialViewRef = useRef(false);
  const [instanceReady, setInstanceReady] = useState(false);
  /** Tracks empty → structure so the first trigger/step can animate into home frame. */
  const prevNodeCountRef = useRef(nodes.length);

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

  // Creation state can return to empty (delete last trigger). Allow home
  // framing again when the next structure appears.
  useEffect(() => {
    if (nodes.length === 0) {
      hasCenteredInitialViewRef.current = false;
      prevNodeCountRef.current = 0;
    }
  }, [nodes.length]);

  // Perform the one-time initial centering, but only once React Flow has
  // measured the canvas. Centering during the 0-dimension window computes a
  // wrong transform that pins a small graph to the top of the view until the
  // first pan re-clamps it against `translateExtent`. Waiting for measured
  // dimensions (and node measurement) also handles nodes that arrive after the
  // canvas mounts. The ref keeps this to a single centering for the component's
  // lifetime, so later resizes never yank the viewport away from the user.
  //
  // Empty → first structure (creation-panel trigger/step): wait two animation
  // frames so dagre positions + translateExtent commit, then animate into the
  // home frame — same cadence as a direction change.
  useEffect(() => {
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

    const fromEmpty = prevNodeCountRef.current === 0;

    if (fromEmpty) {
      let cancelled = false;
      let raf2: number | undefined;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (cancelled || hasCenteredInitialViewRef.current) return;
          hasCenteredInitialViewRef.current = true;
          prevNodeCountRef.current = nodes.length;
          applyHomeViewport(instance, 200);
          onReady?.();
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf1);
        if (raf2 !== undefined) {
          cancelAnimationFrame(raf2);
        }
      };
    }

    hasCenteredInitialViewRef.current = true;
    prevNodeCountRef.current = nodes.length;
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
  ]);

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
        | { stepExecution?: { status?: string }; isTrigger?: boolean; stepType?: string }
        | undefined;
      const status = data?.stepExecution?.status;
      if (status === 'failed') return euiTheme.colors.danger;
      if (status === 'completed') return euiTheme.colors.success;
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
      euiTheme.colors.accent,
      euiTheme.colors.primary,
    ]
  );

  const dimmed = !isYamlValid;
  // Structure (not edit mode) drives navigation chrome: empty creation has
  // nothing to navigate, so zoom/minimap/pan stay absent until a trigger or
  // step exists. Recomputed every render so emptying the workflow later stays correct.
  const hasStructure = (workflow?.triggers?.length ?? 0) > 0 || (workflow?.steps?.length ?? 0) > 0;
  const isEmptyWorkflow = edit !== undefined && !hasStructure;
  const showNavChrome = hasStructure;
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
          // Creation state: static backdrop — no grab affordance on the pane.
          ...(!showNavChrome
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
              panOnScroll={showNavChrome}
              panOnDrag={showNavChrome}
              zoomOnScroll={false}
              zoomOnPinch={showNavChrome}
              zoomOnDoubleClick={false}
              translateExtent={translateExtent}
              minZoom={0.1}
            >
              {showBackground && (
                <Background
                  bgColor={euiTheme.colors.backgroundBaseSubdued}
                  color={backgroundDotColor}
                  gap={12}
                  size={1.5}
                />
              )}
              {toolbar}
              {showZoomCluster && (
                <Panel position="bottom-left" style={{ margin: CORNER_CONTROLS_INSET }}>
                  <div css={chromeAppearCss} data-test-subj="workflowCanvas-navChrome-zoom">
                    <CanvasZoomControls onResetView={handleResetView} onFitView={handleFitView} />
                  </div>
                </Panel>
              )}
              {showMinimapPanel && (
                <Panel position="bottom-right" style={{ margin: CORNER_CONTROLS_INSET }}>
                  <div css={chromeAppearCss} data-test-subj="workflowCanvas-navChrome-minimap">
                    <CanvasMinimap nodeColor={minimapNodeColor} />
                  </div>
                </Panel>
              )}
              {!isEmptyWorkflow && edit && !suppressInsertionControls && (
                <WorkflowGraphEditOverlays nodes={nodes} direction={direction} edit={edit} />
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
