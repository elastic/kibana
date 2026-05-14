/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node, OnNodesChange } from '@xyflow/react';
import { applyNodeChanges, Position } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyGraphLayout,
  computeTopologyFingerprint,
  ExecutionStatus,
  transformWorkflowToGraph,
} from '@kbn/workflows';
import type {
  HandleSide,
  LayoutDirection,
  LayoutedNode,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';

const HANDLE_SIDE_TO_POSITION: Record<HandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

interface UseWorkflowLayoutParams {
  workflow: WorkflowYaml | undefined;
  stepExecutions?: WorkflowStepExecutionDto[];
  searchTerm?: string;
  /** Dagre rank direction: `'TB'` (default) or `'LR'`. */
  direction?: LayoutDirection;
  /** Render nodes in preview mode (icon-only, smaller dimensions). */
  preview?: boolean;
  onPerfMark?: (name: 'transform_ms' | 'layout_ms', ms: number) => void;
  onLayoutFailed?: (reason: string) => void;
}

const PREVIEW_NODE_WIDTH = 48;
const PREVIEW_NODE_HEIGHT = 48;

interface UseWorkflowLayoutResult {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  triggerNodeIds: string[];
  leafNodeIds: string[];
  topologyFingerprint: string;
}

/**
 * Memoized YAML→graph transform + dagre layout. Layout is keyed on the
 * topology fingerprint so non-structural edits (description, params, etc.)
 * never retrigger dagre.
 *
 * Step-execution status and search-match flags are merged onto node data
 * without retriggering layout.
 */
export function useWorkflowLayout({
  workflow,
  stepExecutions,
  searchTerm,
  direction = 'TB',
  preview = false,
  onPerfMark,
  onLayoutFailed,
}: UseWorkflowLayoutParams): UseWorkflowLayoutResult {
  const topologyFingerprint = useMemo(() => computeTopologyFingerprint(workflow), [workflow]);
  const workflowRef = useRef<WorkflowYaml | undefined>(workflow);
  workflowRef.current = workflow;

  const layoutResult = useMemo(() => {
    if (!workflowRef.current)
      return {
        nodes: [] as LayoutedNode[],
        edges: [],
        leafNodeIds: [] as string[],
        triggerNodeIds: [] as string[],
      };
    try {
      const t0 = performance.now();
      const transformed = transformWorkflowToGraph(workflowRef.current);
      onPerfMark?.('transform_ms', performance.now() - t0);

      // In preview mode, shrink each node to a small icon-sized square so the
      // dagre layout produces a compact result fit for a popover.
      const sizedNodes = preview
        ? transformed.nodes.map((n) =>
            n.type === 'foreachGroup'
              ? n
              : {
                  ...n,
                  style: { width: PREVIEW_NODE_WIDTH, height: PREVIEW_NODE_HEIGHT },
                }
          )
        : transformed.nodes;
      const sizedForeachGroups = preview
        ? transformed.foreachGroups.map((g) => ({
            ...g,
            innerNodes: g.innerNodes.map((n) => ({
              ...n,
              style: { width: PREVIEW_NODE_WIDTH, height: PREVIEW_NODE_HEIGHT },
            })),
          }))
        : transformed.foreachGroups;

      const t1 = performance.now();
      const laid = applyGraphLayout(sizedNodes, transformed.edges, sizedForeachGroups, {
        direction,
        compact: preview,
      });
      onPerfMark?.('layout_ms', performance.now() - t1);

      // Compute trigger and leaf ids from the transform output (cheap)
      const triggerNodeIds = transformed.nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
      const incomingByTarget = new Set(transformed.edges.map((e) => e.target));
      const outgoingBySource = new Set(transformed.edges.map((e) => e.source));
      const leafNodeIds = transformed.nodes
        .filter((n) => n.type === 'step' && !outgoingBySource.has(n.id))
        .map((n) => n.id);
      // unused but kept for future: nodes with no incoming edges
      void incomingByTarget;

      return { nodes: laid.nodes, edges: laid.edges, triggerNodeIds, leafNodeIds };
    } catch (err) {
      onLayoutFailed?.(err instanceof Error ? err.message : 'unknown');
      return {
        nodes: [] as LayoutedNode[],
        edges: [],
        leafNodeIds: [] as string[],
        triggerNodeIds: [] as string[],
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on topology + direction + preview
  }, [topologyFingerprint, direction, preview]);

  const stepExecutionMap = useMemo(() => {
    if (!stepExecutions) return null;
    return stepExecutions.reduce<Record<string, WorkflowStepExecutionDto>>((acc, e) => {
      acc[e.stepId] = e;
      return acc;
    }, {});
  }, [stepExecutions]);

  const searchActive = (searchTerm ?? '').trim().length > 0;
  const lowerSearch = (searchTerm ?? '').trim().toLowerCase();

  const derivedNodes = useMemo<Node[]>(() => {
    return layoutResult.nodes.map((n) => {
      const data = n.data as Record<string, unknown>;
      const label = typeof data.label === 'string' ? data.label : undefined;
      const stepType = typeof data.stepType === 'string' ? data.stepType : undefined;
      const matchesSearch =
        !searchActive ||
        (label?.toLowerCase().includes(lowerSearch) ?? false) ||
        (stepType?.toLowerCase().includes(lowerSearch) ?? false);
      const exec = stepExecutionMap?.[label ?? n.id] ?? stepExecutionMap?.[n.id];
      const targetPosition = HANDLE_SIDE_TO_POSITION[n.targetPosition ?? 'top'];
      const sourcePosition = HANDLE_SIDE_TO_POSITION[n.sourcePosition ?? 'bottom'];
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        parentId: n.parentId,
        extent: n.extent,
        style: { width: n.style.width, height: n.style.height },
        targetPosition,
        sourcePosition,
        data: {
          ...(n.data as Record<string, unknown>),
          stepExecution: exec,
          matchesSearch,
          searchActive,
          preview,
        },
      } as Node;
    });
  }, [layoutResult.nodes, stepExecutionMap, searchActive, lowerSearch, preview]);

  const derivedEdges = useMemo<Edge[]>(() => {
    // Build a fast id→node map so edge lookups don't scan the full node list.
    const nodeById = new Map(layoutResult.nodes.map((n) => [n.id, n]));
    // Mirror the same label-first lookup used for nodes: stepExecutionMap is
    // keyed by stepId which equals the step label, not the graph node id.
    const getExec = (nodeId: string): WorkflowStepExecutionDto | undefined => {
      const nodeData = nodeById.get(nodeId)?.data as Record<string, unknown> | undefined;
      const label = typeof nodeData?.label === 'string' ? nodeData.label : undefined;
      return (label ? stepExecutionMap?.[label] : undefined) ?? stepExecutionMap?.[nodeId];
    };

    return layoutResult.edges.map((e) => {
      const sourceExec = getExec(e.source);
      // An arrow turns green once the source step has completed — that is
      // exactly when execution has passed through this edge.
      const traversed = sourceExec?.status === ExecutionStatus.COMPLETED;
      const traversedStatus = sourceExec?.status as ExecutionStatus | undefined;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'workflowEdge',
        data: {
          label: e.label,
          traversed,
          traversedStatus,
          points: e.points,
        },
      } as Edge;
    });
  }, [layoutResult.edges, layoutResult.nodes, stepExecutionMap]);

  const [nodes, setNodes] = useState<Node[]>(derivedNodes);
  const [edges, setEdges] = useState<Edge[]>(derivedEdges);

  useEffect(() => {
    setNodes(derivedNodes);
  }, [derivedNodes]);
  useEffect(() => {
    setEdges(derivedEdges);
  }, [derivedEdges]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    triggerNodeIds: layoutResult.triggerNodeIds,
    leafNodeIds: layoutResult.leafNodeIds,
    topologyFingerprint,
  };
}
