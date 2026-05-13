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
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import { useWorkflowLayout } from './use_workflow_layout';
import { WorkflowGraphActionsContext } from './workflow_graph_actions_context';
import { WorkflowGraphEdge } from './workflow_graph_edge';
import { WorkflowGraphForeachGroupNode } from './workflow_graph_foreach_group_node';
import { WorkflowGraphNode } from './workflow_graph_node';

const NODE_TYPES: NodeTypes = {
  step: WorkflowGraphNode,
  trigger: WorkflowGraphNode,
  foreachGroup: WorkflowGraphForeachGroupNode,
};

const EDGE_TYPES: EdgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

// `zIndex: -1` forces React Flow to render the edge layer strictly below
// every node — without this, edges connected to parent (`foreachGroup`)
// nodes can paint above the parent's body, so the trunk-stub overshoot
// at the target arrow becomes visible through the foreach header.
const DEFAULT_EDGE_OPTIONS = { type: 'workflowEdge', zIndex: -1 } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;
// Predefined zoom for the initial graph view; user can zoom in/out from
// the bar afterwards. Picked to match the readability shown in the design.
const INITIAL_ZOOM = 1;
const TOP_PADDING = 80;

export interface WorkflowGraphCanvasProps {
  workflow: WorkflowYaml | undefined;
  stepExecutions?: WorkflowStepExecutionDto[];
  isYamlValid: boolean;
  selectedStepId?: string;
  onStepSelect: (stepId: string | undefined) => void;
  onNodeClick?: (stepId: string, stepType: string) => void;
  onLayoutFailed?: (reason: string) => void;
  onPerfMark?: (name: 'transform_ms' | 'layout_ms' | 'first_paint_ms', ms: number) => void;
  colorMode?: ColorMode;
  /**
   * When the canvas mounts (e.g. user switched from YAML to graph view),
   * centers on the node whose `data.label` equals this id. Falls back to
   * top-center of the graph if no match.
   */
  focusStepId?: string | null;
  /** Triggered by the hover "Run step" icon on a node. */
  onStepRun?: (stepName: string) => void;
  /** Disables the per-node Run action when false. */
  canRunSteps?: boolean;
  /** Called before the per-node "More" popover opens. */
  onOpenStepMenu?: (stepName: string) => void;
  /** Renders the menu items for a node's "More" popover. */
  renderStepMenuItems?: (close: () => void) => React.ReactNode;
  /** Dagre rank direction (default `'TB'`). */
  direction?: LayoutDirection;
  /**
   * Compact static-preview mode: icon-only nodes, no minimap, no banner, no
   * interaction. Used by the workflow-list hover preview.
   */
  previewMode?: boolean;
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
    direction = 'TB',
    previewMode = false,
  } = props;
  const actions = useMemo(
    () => ({ onStepRun, canRunSteps, onOpenStepMenu, renderStepMenuItems }),
    [onStepRun, canRunSteps, onOpenStepMenu, renderStepMenuItems]
  );
  const { euiTheme } = useEuiTheme();

  const { nodes, edges, onNodesChange } = useWorkflowLayout({
    workflow,
    stepExecutions,
    searchTerm: '',
    direction,
    preview: previewMode,
    onPerfMark,
    onLayoutFailed,
  });

  // First-paint mark
  const firstPaintRecorded = useRef(false);
  useEffect(() => {
    if (firstPaintRecorded.current) return;
    if (nodes.length === 0) return;
    firstPaintRecorded.current = true;
    requestAnimationFrame(() => {
      onPerfMark?.('first_paint_ms', performance.now());
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
    const widthOf = (n: (typeof decoratedNodes)[number]) =>
      typeof n.width === 'number' ? n.width : 300;
    const heightOf = (n: (typeof decoratedNodes)[number]) =>
      typeof n.height === 'number' ? n.height : 64;
    const xs = decoratedNodes.map((n) => n.position.x);
    const ys = decoratedNodes.map((n) => n.position.y);
    const maxXs = decoratedNodes.map((n) => n.position.x + widthOf(n));
    const maxYs = decoratedNodes.map((n) => n.position.y + heightOf(n));
    const PAD = 400;
    return [
      [Math.min(...xs) - PAD, Math.min(...ys) - PAD],
      [Math.max(...maxXs) + PAD, Math.max(...maxYs) + PAD],
    ];
  }, [decoratedNodes]);

  // Position the initial view: if focusStepId matches a node, centre on
  // that node; otherwise centre on the graph's top row.
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
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
    },
    [decoratedNodes, focusStepId]
  );

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
          background: euiTheme.colors.backgroundBaseSubdued,
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
          <ReactFlow
            nodes={decoratedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            proOptions={PRO_OPTIONS}
            colorMode={colorMode}
            onInit={previewMode ? undefined : handleInit}
            fitView={previewMode}
            fitViewOptions={previewMode ? { padding: 0.08, minZoom: 0.2, maxZoom: 2 } : undefined}
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
            <Background
              bgColor={euiTheme.colors.backgroundBaseSubdued}
              color={euiTheme.colors.textSubdued}
            />
            {!previewMode && (
              <MiniMap
                pannable
                zoomable
                position="bottom-left"
                bgColor="#ffffff"
                maskColor="rgba(227, 232, 242, 0.55)"
                nodeColor={(n) => {
                  const status = (n.data as { stepExecution?: { status?: string } } | undefined)
                    ?.stepExecution?.status;
                  return status === 'failed' ? '#c61e25' : '#0b64dd';
                }}
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
