/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import {
  Background,
  type ColorMode,
  type EdgeTypes,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  type ReactFlowInstance,
  ReactFlowProvider,
} from '@xyflow/react';
import React, { Component, type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import { useWorkflowLayout } from './use_workflow_layout';
import { type RenderStepIcon, WorkflowGraphActionsContext } from './workflow_graph_actions_context';
import { WorkflowGraphEdge } from './workflow_graph_edge';
import { WorkflowGraphForeachGroupNode } from './workflow_graph_foreach_group_node';
import { WorkflowGraphNode } from './workflow_graph_node';

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
    if (this.state.error) return null;
    return this.props.children;
  }
}

const NODE_TYPES: NodeTypes = {
  step: WorkflowGraphNode,
  trigger: WorkflowGraphNode,
  foreachGroup: WorkflowGraphForeachGroupNode,
};

const EDGE_TYPES: EdgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

const PRO_OPTIONS = { hideAttribution: true } as const;
// Predefined zoom for the initial graph view; user can zoom in/out from
// the bar afterwards. Picked to match the readability shown in the design.
const INITIAL_ZOOM = 1;
const TOP_PADDING = 80;

export interface WorkflowGraphCanvasProps {
  readonly workflow: WorkflowYaml | undefined;
  readonly stepExecutions?: WorkflowStepExecutionDto[];
  readonly isYamlValid: boolean;
  readonly selectedStepId?: string;
  readonly onStepSelect: (stepId: string | undefined) => void;
  readonly onNodeClick?: (stepId: string, stepType: string) => void;
  readonly onLayoutFailed?: (reason: string) => void;
  readonly onPerfMark?: (name: 'transform_ms' | 'layout_ms' | 'first_paint_ms', ms: number) => void;
  readonly colorMode?: ColorMode;
  /**
   * When the canvas mounts (e.g. user switched from YAML to graph view),
   * centers on the node whose `data.label` equals this id. Falls back to
   * top-center of the graph if no match.
   */
  readonly focusStepId?: string | null;
  /** Triggered by the hover "Run step" icon on a node. */
  readonly onStepRun?: (stepName: string) => void;
  /** Disables the per-node Run action when false. */
  readonly canRunSteps?: boolean;
  /** Called before the per-node "More" popover opens. */
  readonly onOpenStepMenu?: (stepName: string) => void;
  /** Renders the menu items for a node's "More" popover. */
  readonly renderStepMenuItems?: (close: () => void) => React.ReactNode;
  /**
   * Optional renderer for step icons. When provided the canvas delegates icon
   * resolution to the caller (e.g. plugin's `<StepIcon/>`) instead of the
   * built-in fallback table. Falls back gracefully when omitted.
   */
  readonly renderStepIcon?: RenderStepIcon;
  /** Dagre rank direction (default `'TB'`). */
  readonly direction?: LayoutDirection;
  /**
   * Compact static-preview mode: icon-only nodes, no minimap, no banner, no
   * interaction. Used by the workflow-list hover preview.
   */
  readonly previewMode?: boolean;
  /**
   * When true the viewport is fitted to show all nodes on init, overriding the
   * default centre-on-top behaviour. Does not imply previewMode.
   */
  readonly fitView?: boolean;
  /** Options forwarded to ReactFlow's fitView when `fitView` is true. */
  readonly fitViewOptions?: {
    readonly padding?: number;
    readonly minZoom?: number;
    readonly maxZoom?: number;
  };
  /**
   * Whether to render the minimap. Defaults to true when not in previewMode.
   * Pass false to suppress it (e.g. for off-screen export canvases).
   */
  readonly showMinimap?: boolean;
  /**
   * Whether to render the dot-pattern background and the coloured wrapper div
   * background. Pass false for export canvases that need a transparent output.
   */
  readonly showBackground?: boolean;
  /**
   * Override the z-index applied to every edge. The default (-1) keeps edges
   * below nodes in the live editor, but breaks DOM-to-image capture because
   * negative-z children are clipped by the stacking context. Pass 0 for
   * off-screen export canvases.
   */
  readonly edgeZIndex?: number;
  /**
   * Called once after ReactFlow has initialised and positioned the viewport
   * (including any fitView). Useful for off-screen export canvases that need
   * to know when the graph is ready to capture.
   */
  readonly onReady?: () => void;
}

function WorkflowGraphCanvasInner(props: WorkflowGraphCanvasProps) {
  const {
    workflow,
    stepExecutions,
    isYamlValid,
    selectedStepId,
    onStepSelect,
    onNodeClick,
    onLayoutFailed,
    onPerfMark,
    colorMode,
    focusStepId,
    onStepRun,
    canRunSteps,
    onOpenStepMenu,
    renderStepMenuItems,
    renderStepIcon,
    direction = 'TB',
    previewMode = false,
    fitView: fitViewProp = false,
    fitViewOptions: fitViewOptionsProp,
    showMinimap = true,
    showBackground = true,
    edgeZIndex = -1,
    onReady,
  } = props;

  const defaultEdgeOptions = useMemo(
    () => ({ type: 'workflowEdge', zIndex: edgeZIndex }),
    [edgeZIndex]
  );
  const actions = useMemo(
    () => ({
      onStepRun,
      canRunSteps,
      onOpenStepMenu,
      renderStepMenuItems,
      renderStepIcon,
      onStepSelect,
    }),
    [onStepRun, canRunSteps, onOpenStepMenu, renderStepMenuItems, renderStepIcon, onStepSelect]
  );
  const { euiTheme } = useEuiTheme();

  const { nodes, edges } = useWorkflowLayout({
    workflow,
    stepExecutions,
    searchTerm: '',
    direction,
    preview: previewMode,
    onPerfMark,
    onLayoutFailed,
  });

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

  // Decorate nodes with selection state — without rebuilding identity for non-changed ones
  const decoratedNodes = useMemo(() => {
    if (!selectedStepId) return nodes;
    return nodes.map((n) => (n.id === selectedStepId ? { ...n, selected: true } : n));
  }, [nodes, selectedStepId]);

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

  // Restrict panning to the graph's bounding box plus a comfortable margin
  // so the user can't scroll far off into empty space.
  const translateExtent = useMemo<[[number, number], [number, number]]>(() => {
    if (decoratedNodes.length === 0) {
      return [
        [-1000, -1000],
        [1000, 1000],
      ];
    }
    const PAD = 400;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of decoratedNodes) {
      const w = typeof n.width === 'number' ? n.width : 300;
      const h = typeof n.height === 'number' ? n.height : 64;
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.x + w > maxX) maxX = n.position.x + w;
      if (n.position.y + h > maxY) maxY = n.position.y + h;
    }
    return [
      [minX - PAD, minY - PAD],
      [maxX + PAD, maxY + PAD],
    ];
  }, [decoratedNodes]);

  // Position the initial view: if focusStepId matches a node, centre on
  // that node; otherwise centre on the graph's top row.
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      // When fitView is declarative (fitViewProp=true), ReactFlow handles the
      // viewport positioning internally before firing onInit. Just signal ready.
      if (fitViewProp) {
        onReady?.();
        return;
      }

      if (decoratedNodes.length === 0) return;
      const widthOf = (n: (typeof decoratedNodes)[number]) =>
        typeof n.width === 'number' ? n.width : 200;
      const heightOf = (n: (typeof decoratedNodes)[number]) =>
        typeof n.height === 'number' ? n.height : 64;

      if (focusStepId) {
        const focusNode = decoratedNodes.find((n) => {
          const data = n.data as { label?: string } | undefined;
          return data?.label === focusStepId;
        });
        if (focusNode) {
          instance.setCenter(
            focusNode.position.x + widthOf(focusNode) / 2,
            focusNode.position.y + heightOf(focusNode) / 2,
            { zoom: INITIAL_ZOOM, duration: 0 }
          );
          onReady?.();
          return;
        }
      }

      const minY = Math.min(...decoratedNodes.map((n) => n.position.y));
      const minX = Math.min(...decoratedNodes.map((n) => n.position.x));
      const maxX = Math.max(...decoratedNodes.map((n) => n.position.x + widthOf(n)));
      const graphCenterX = (minX + maxX) / 2;
      const wrapperHeight = wrapperRef.current?.clientHeight ?? 600;
      instance.setCenter(graphCenterX, minY + wrapperHeight / 2 - TOP_PADDING, {
        zoom: INITIAL_ZOOM,
        duration: 0,
      });
      onReady?.();
    },
    [decoratedNodes, fitViewProp, focusStepId, onReady]
  );

  // In previewMode ReactFlow calls fitView internally (no handleInit); fire
  // onReady after the first layout so callers know the canvas is capturable.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const readyFiredRef = useRef(false);
  useEffect(() => {
    if (!previewMode || readyFiredRef.current || decoratedNodes.length === 0) return;
    readyFiredRef.current = true;
    // Two rAFs: first lets React commit the node positions, second lets
    // ReactFlow's fitView animation settle before we signal ready.
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        onReadyRef.current?.();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [previewMode, decoratedNodes.length]);

  const minimapNodeColor = useCallback((n: { data?: unknown }) => {
    const status = (n.data as { stepExecution?: { status?: string } } | undefined)?.stepExecution
      ?.status;
    return status === 'failed' ? '#c61e25' : '#0b64dd';
  }, []);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const dimmed = !isYamlValid;

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
        {dimmed && !previewMode && (
          <div
            css={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              zIndex: 10,
            }}
          >
            <EuiCallOut
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
            opacity: dimmed && !previewMode ? 0.5 : 1,
            pointerEvents: dimmed && !previewMode ? 'none' : 'auto',
            transition: 'opacity 200ms ease',
          }}
        >
          <GraphErrorBoundary onError={onLayoutFailed}>
            <ReactFlow
              nodes={decoratedNodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              defaultEdgeOptions={defaultEdgeOptions}
              proOptions={PRO_OPTIONS}
              colorMode={colorMode}
              onInit={previewMode ? undefined : handleInit}
              fitView={previewMode || fitViewProp}
              fitViewOptions={
                previewMode
                  ? { padding: 0.08, minZoom: 0.2, maxZoom: 2 }
                  : fitViewProp
                  ? fitViewOptionsProp
                  : undefined
              }
              onNodeClick={previewMode ? undefined : handleNodeClick}
              onPaneClick={previewMode ? undefined : handlePaneClick}
              nodesDraggable={false}
              nodesConnectable={false}
              // Prevent React Flow from boosting a selected node's z-index above
              // its siblings / parent. Without this, selecting an inner step of
              // a foreach group lifts the (transparent) group body above the
              // outer edges that pass behind it, making those edges visible
              // through the body.
              elevateNodesOnSelect={false}
              elevateEdgesOnSelect={false}
              elementsSelectable={!previewMode}
              panOnScroll={!previewMode}
              panOnDrag={!previewMode}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              translateExtent={previewMode ? undefined : translateExtent}
            >
              {showBackground && (
                <Background
                  bgColor={euiTheme.colors.backgroundBaseSubdued}
                  color={euiTheme.colors.textSubdued}
                />
              )}
              {!previewMode && showMinimap && (
                <MiniMap
                  pannable
                  zoomable
                  position="bottom-left"
                  bgColor="#ffffff"
                  maskColor="rgba(227, 232, 242, 0.55)"
                  nodeColor={minimapNodeColor}
                  nodeStrokeWidth={0}
                  nodeBorderRadius={1}
                  style={{
                    width: 160,
                    height: 120,
                    background: '#f2f6fb',
                    border: '1px solid #e3e8f2',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                />
              )}
            </ReactFlow>
          </GraphErrorBoundary>
        </div>
      </div>
    </WorkflowGraphActionsContext.Provider>
  );
}

/**
 * Standalone canvas that owns its own ReactFlowProvider. Use when the canvas
 * is rendered without an outer provider (e.g. the list-page preview popover).
 */
export function WorkflowGraphCanvas(props: WorkflowGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

/**
 * Inner version of the canvas — does NOT wrap itself in a `ReactFlowProvider`.
 * Use when a parent provides the provider (e.g. so sibling components like
 * the floating bottom bar can `useReactFlow()` against the same flow).
 */
export const WorkflowGraphCanvasWithoutProvider = WorkflowGraphCanvasInner;
