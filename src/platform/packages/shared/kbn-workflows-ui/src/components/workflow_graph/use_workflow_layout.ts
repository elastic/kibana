/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { useMemo, useRef } from 'react';
import {
  applyGraphLayout,
  computeTopologyFingerprint,
  ExecutionStatus,
  transformWorkflowToGraph,
} from '@kbn/workflows';
import type {
  HandleSide,
  LayoutDirection,
  LayoutedEdge,
  LayoutedNode,
  TransformResult,
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
  /**
   * Optional precomputed transform result for this exact workflow snapshot.
   * When provided, the hook will reuse it instead of calling `transformWorkflowToGraph`.
   */
  transformed?: TransformResult;
  stepExecutions?: WorkflowStepExecutionDto[];
  /** Dagre rank direction: `'TB'` (default) or `'LR'`. */
  direction?: LayoutDirection;
  onPerfMark?: (name: 'transform_ms' | 'layout_ms', ms: number) => void;
  onLayoutFailed?: (reason: string) => void;
}

interface UseWorkflowLayoutResult {
  nodes: Node[];
  edges: Edge[];
  triggerNodeIds: string[];
  leafNodeIds: string[];
  topologyFingerprint: string;
}

/**
 * Memoized YAML→graph transform + dagre layout. Layout is keyed on the
 * topology fingerprint so non-structural edits (description, params, etc.)
 * never retrigger dagre.
 *
 * Step-execution status is merged onto node data without retriggering layout.
 */
export function useWorkflowLayout({
  workflow,
  transformed: transformedProp,
  stepExecutions,
  direction = 'TB',
  onPerfMark,
  onLayoutFailed,
}: UseWorkflowLayoutParams): UseWorkflowLayoutResult {
  const topologyFingerprint = useMemo(() => computeTopologyFingerprint(workflow), [workflow]);

  const transformed = useMemo(() => {
    if (transformedProp) return transformedProp;
    if (!workflow) return { nodes: [], edges: [], foreachGroups: [] };
    const t0 = performance.now();
    const next = transformWorkflowToGraph(workflow);
    onPerfMark?.('transform_ms', performance.now() - t0);
    return next;
  }, [transformedProp, workflow, onPerfMark]);

  const transformedRef = useRef(transformed);
  transformedRef.current = transformed;

  const layoutSnapshot = useMemo(() => {
    if (!workflow) {
      return {
        nodes: [] as LayoutedNode[],
        edges: [] as LayoutedEdge[],
        triggerNodeIds: [] as string[],
        leafNodeIds: [] as string[],
      };
    }
    try {
      const t1 = performance.now();
      const laid = applyGraphLayout(
        transformedRef.current.nodes,
        transformedRef.current.edges,
        transformedRef.current.foreachGroups,
        { direction }
      );
      onPerfMark?.('layout_ms', performance.now() - t1);

      // Compute trigger and leaf ids from the transform output (cheap)
      const triggerNodeIds = transformedRef.current.nodes
        .filter((n) => n.type === 'trigger')
        .map((n) => n.id);
      const outgoingBySource = new Set(transformedRef.current.edges.map((e) => e.source));
      const leafNodeIds = transformedRef.current.nodes
        .filter((n) => n.type === 'step' && !outgoingBySource.has(n.id))
        .map((n) => n.id);

      return { nodes: laid.nodes, edges: laid.edges, triggerNodeIds, leafNodeIds };
    } catch (err) {
      onLayoutFailed?.(err instanceof Error ? err.message : 'unknown');
      return {
        nodes: [] as LayoutedNode[],
        edges: [] as LayoutedEdge[],
        triggerNodeIds: [] as string[],
        leafNodeIds: [] as string[],
      };
    }
  }, [direction, onLayoutFailed, onPerfMark, workflow]);

  const stepExecutionMap = useMemo(() => {
    if (!stepExecutions) return null;
    return stepExecutions.reduce<Record<string, WorkflowStepExecutionDto>>((acc, e) => {
      acc[e.stepId] = e;
      return acc;
    }, {});
  }, [stepExecutions]);

  const derivedNodes = useMemo<Node[]>(() => {
    const layoutNodeById = new Map(layoutSnapshot.nodes.map((n) => [n.id, n]));
    const allNodes = [
      ...transformed.nodes,
      ...transformed.foreachGroups.flatMap((g) => g.innerNodes),
    ] as const;
    return allNodes.map((n) => {
      const laid = layoutNodeById.get(n.id);
      if (!laid) {
        return { id: n.id, type: n.type, position: { x: 0, y: 0 }, data: n.data };
      }
      const data = n.data as Record<string, unknown>;
      const label = typeof data.label === 'string' ? data.label : undefined;
      const exec = stepExecutionMap?.[label ?? n.id] ?? stepExecutionMap?.[n.id];
      const targetPosition = HANDLE_SIDE_TO_POSITION[laid.targetPosition ?? 'top'];
      const sourcePosition = HANDLE_SIDE_TO_POSITION[laid.sourcePosition ?? 'bottom'];
      return {
        id: n.id,
        type: n.type,
        position: laid.position,
        parentId: n.parentId,
        extent: n.extent,
        width: laid.style.width,
        height: laid.style.height,
        style: { width: laid.style.width, height: laid.style.height },
        targetPosition,
        sourcePosition,
        data: {
          ...(n.data as Record<string, unknown>),
          stepExecution: exec,
        },
      };
    });
  }, [layoutSnapshot.nodes, stepExecutionMap, transformed.foreachGroups, transformed.nodes]);

  const derivedEdges = useMemo<Edge[]>(() => {
    const layoutEdgeById = new Map(layoutSnapshot.edges.map((e) => [e.id, e]));
    const allNodes = [
      ...transformed.nodes,
      ...transformed.foreachGroups.flatMap((g) => g.innerNodes),
    ] as const;
    const nodeById = new Map(allNodes.map((n) => [n.id, n]));
    // Mirror the same label-first lookup used for nodes: stepExecutionMap is
    // keyed by stepId which equals the step label, not the graph node id.
    const getExec = (nodeId: string): WorkflowStepExecutionDto | undefined => {
      const nodeData = nodeById.get(nodeId)?.data as Record<string, unknown> | undefined;
      const label = typeof nodeData?.label === 'string' ? nodeData.label : undefined;
      return (label ? stepExecutionMap?.[label] : undefined) ?? stepExecutionMap?.[nodeId];
    };

    const allEdges = [
      ...transformed.edges,
      ...transformed.foreachGroups.flatMap((g) => g.innerEdges),
    ] as const;

    return allEdges.map((e) => {
      const laid = layoutEdgeById.get(e.id);
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
          points: laid?.points,
        },
      };
    });
  }, [
    layoutSnapshot.edges,
    stepExecutionMap,
    transformed.edges,
    transformed.foreachGroups,
    transformed.nodes,
  ]);

  return {
    nodes: derivedNodes,
    edges: derivedEdges,
    triggerNodeIds: layoutSnapshot.triggerNodeIds,
    leafNodeIds: layoutSnapshot.leafNodeIds,
    topologyFingerprint,
  };
}
