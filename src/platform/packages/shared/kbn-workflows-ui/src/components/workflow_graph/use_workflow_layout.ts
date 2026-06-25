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
import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import { dagLayout } from '@kbn/dag-layout';
import {
  computeTopologyFingerprint,
  ExecutionStatus,
  transformWorkflowToGraph,
} from '@kbn/workflows';
import type {
  HandleSide,
  LayoutDirection,
  TransformResult,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';

// Workflow-specific layout constants. These encode domain knowledge (foreach
// header height, gutter widths) that does not belong in @kbn/dag-layout.
const WORKFLOW_COMPOUND_PADDING = { top: 70, right: 32, bottom: 32, left: 32 } as const;
const WORKFLOW_NODE_SEP = 50;
const WORKFLOW_RANK_SEP = 70;

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
    if (!workflow) return { nodes: [], edges: [], foreachGroups: [], bypassLaneNodes: [] };
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
        nodes: [] as DagPositionedNode[],
        edges: [] as DagPositionedEdge[],
        triggerNodeIds: [] as string[],
        leafNodeIds: [] as string[],
      };
    }
    try {
      const { nodes, edges, foreachGroups, bypassLaneNodes } = transformedRef.current;

      const dagNodes = [
        ...nodes.map((n) => ({
          id: n.id,
          width: n.style.width,
          height: n.style.height,
        })),
        // Bypass lane nodes live outside domain `nodes` — add them here so dagre
        // sees them and allocates lanes for unbalanced if/switch branches.
        ...bypassLaneNodes.map((n) => ({
          id: n.id,
          width: n.style.width,
          height: n.style.height,
        })),
      ];
      const dagEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
      const dagGroups = foreachGroups.map((g) => ({
        id: g.id,
        innerNodes: [
          ...g.innerNodes.map((n) => ({
            id: n.id,
            width: n.style.width,
            height: n.style.height,
          })),
          ...g.bypassLaneNodes.map((n) => ({
            id: n.id,
            width: n.style.width,
            height: n.style.height,
          })),
        ],
        innerEdges: g.innerEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      }));

      const t1 = performance.now();
      const laid = dagLayout(dagNodes, dagEdges, dagGroups, {
        direction,
        nodeSep: WORKFLOW_NODE_SEP,
        rankSep: WORKFLOW_RANK_SEP,
        compoundPadding: WORKFLOW_COMPOUND_PADDING,
      });
      onPerfMark?.('layout_ms', performance.now() - t1);

      const triggerNodeIds = nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
      const outgoingBySource = new Set(edges.map((e) => e.source));
      const leafNodeIds = nodes
        .filter((n) => n.type === 'step' && !outgoingBySource.has(n.id))
        .map((n) => n.id);

      return { nodes: laid.nodes, edges: laid.edges, triggerNodeIds, leafNodeIds };
    } catch (err) {
      onLayoutFailed?.(err instanceof Error ? err.message : 'unknown');
      return {
        nodes: [] as DagPositionedNode[],
        edges: [] as DagPositionedEdge[],
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

  const syntheticTriggerExecution = useMemo<WorkflowStepExecutionDto | null>(() => {
    if (!stepExecutions || stepExecutions.length === 0) return null;
    return { status: ExecutionStatus.COMPLETED } as WorkflowStepExecutionDto;
  }, [stepExecutions]);

  const derivedNodes = useMemo<Node[]>(() => {
    const positionedById = new Map(layoutSnapshot.nodes.map((n) => [n.id, n]));

    // Build a map of inner node id → group id so we can set parentId/extent.
    const innerNodeToGroupId = new Map<string, string>();
    for (const g of transformed.foreachGroups) {
      for (const n of g.innerNodes) {
        innerNodeToGroupId.set(n.id, g.id);
      }
    }

    const isHorizontal = direction === 'LR';
    const targetPosition = HANDLE_SIDE_TO_POSITION[isHorizontal ? 'left' : 'top'];
    const sourcePosition = HANDLE_SIDE_TO_POSITION[isHorizontal ? 'right' : 'bottom'];

    const allDomainNodes = [
      ...transformed.nodes,
      ...transformed.foreachGroups.flatMap((g) => g.innerNodes),
    ] as const;

    // Collect all bypass lane node ids so we can render them as 'bypassLane'
    // type nodes (structural only — no selection, no click target).
    const allBypassLaneIds = new Set([
      ...transformed.bypassLaneNodes.map((n) => n.id),
      ...transformed.foreachGroups.flatMap((g) => g.bypassLaneNodes.map((n) => n.id)),
    ]);

    const domainNodes = allDomainNodes.map((n) => {
      const pos = positionedById.get(n.id);
      if (!pos) {
        return { id: n.id, type: n.type, position: { x: 0, y: 0 }, data: n.data };
      }

      // dagLayout returns absolute coordinates. React Flow expects positions
      // relative to the parent when parentId is set, so subtract the parent's
      // absolute origin for inner nodes.
      const parentId = innerNodeToGroupId.get(n.id);
      let position: { x: number; y: number };
      if (parentId) {
        const parentPos = positionedById.get(parentId);
        position = parentPos
          ? { x: pos.x - parentPos.x, y: pos.y - parentPos.y }
          : { x: pos.x, y: pos.y };
      } else {
        position = { x: pos.x, y: pos.y };
      }

      const data = n.data as Record<string, unknown>;
      const label = typeof data.label === 'string' ? data.label : undefined;
      const explicitExec = stepExecutionMap?.[label ?? n.id] ?? stepExecutionMap?.[n.id];
      const exec =
        explicitExec ?? (n.type === 'trigger' ? syntheticTriggerExecution ?? undefined : undefined);

      return {
        id: n.id,
        type: n.type,
        position,
        parentId,
        extent: parentId ? ('parent' as const) : undefined,
        width: pos.width,
        height: pos.height,
        targetPosition,
        sourcePosition,
        data: {
          ...(n.data as Record<string, unknown>),
          stepExecution: exec,
        },
      };
    });

    // Bypass lane nodes: structural only — invisible pass-through nodes that
    // give dagre a lane to route through for unbalanced if/switch branches.
    const bypassLaneReactNodes: Node[] = [...allBypassLaneIds].map((id) => {
      const pos = positionedById.get(id);
      const parentId = innerNodeToGroupId.get(id);
      let position: { x: number; y: number };
      if (pos) {
        if (parentId) {
          const parentPos = positionedById.get(parentId);
          position = parentPos
            ? { x: pos.x - parentPos.x, y: pos.y - parentPos.y }
            : { x: pos.x, y: pos.y };
        } else {
          position = { x: pos.x, y: pos.y };
        }
      } else {
        position = { x: 0, y: 0 };
      }
      return {
        id,
        type: 'bypassLane',
        position,
        parentId,
        extent: parentId ? ('parent' as const) : undefined,
        width: pos?.width ?? 1,
        height: pos?.height ?? 1,
        selectable: false,
        style: {
          width: pos?.width ?? 1,
          height: pos?.height ?? 1,
          pointerEvents: 'none' as const,
        },
        targetPosition,
        sourcePosition,
        data: {},
      };
    });

    return [...domainNodes, ...bypassLaneReactNodes];
  }, [
    layoutSnapshot.nodes,
    stepExecutionMap,
    syntheticTriggerExecution,
    transformed.bypassLaneNodes,
    transformed.foreachGroups,
    transformed.nodes,
    direction,
  ]);

  const derivedEdges = useMemo<Edge[]>(() => {
    const layoutEdgeById = new Map(layoutSnapshot.edges.map((e) => [e.id, e]));
    const allDomainNodes = [
      ...transformed.nodes,
      ...transformed.foreachGroups.flatMap((g) => g.innerNodes),
    ] as const;
    const nodeById = new Map(allDomainNodes.map((n) => [n.id, n]));
    const getExec = (nodeId: string): WorkflowStepExecutionDto | undefined => {
      const nodeData = nodeById.get(nodeId)?.data as Record<string, unknown> | undefined;
      const label = typeof nodeData?.label === 'string' ? nodeData.label : undefined;
      return (label ? stepExecutionMap?.[label] : undefined) ?? stepExecutionMap?.[nodeId];
    };

    // Bypass lane node ids — edges whose target is a bypass lane node suppress
    // the arrowhead (hideEndMarker) since the lane is a visual pass-through.
    const allBypassLaneIds = new Set([
      ...transformed.bypassLaneNodes.map((n) => n.id),
      ...transformed.foreachGroups.flatMap((g) => g.bypassLaneNodes.map((n) => n.id)),
    ]);

    const allEdges = [
      ...transformed.edges,
      ...transformed.foreachGroups.flatMap((g) => g.innerEdges),
    ] as const;

    // A node is a "merge" node when it has >1 incoming edge and at least one of
    // those sources is a bypass lane node (unbalanced if/switch fan-in).  Every
    // fan-in edge of such a node must route on the merge bus so all legs share
    // the same target bus + trunk — the symmetric inverse of the fork bus.
    // Keying by target (rather than by source) replicates the original transform
    // semantics: sources.length > 1 && sources.some(s => isBypass(s)).
    const incomingByTarget = new Map<string, string[]>();
    for (const e of allEdges) {
      const arr = incomingByTarget.get(e.target);
      if (arr) arr.push(e.source);
      else incomingByTarget.set(e.target, [e.source]);
    }
    const mergeNodeIds = new Set<string>();
    for (const [target, sources] of incomingByTarget) {
      if (sources.length > 1 && sources.some((s) => allBypassLaneIds.has(s))) {
        mergeNodeIds.add(target);
      }
    }

    return allEdges.map((e) => {
      const laid = layoutEdgeById.get(e.id);
      const sourceExec = getExec(e.source);
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
          branchType: e.branchType,
          isMerge: mergeNodeIds.has(e.target),
          hideEndMarker: allBypassLaneIds.has(e.target),
        },
      };
    });
  }, [
    layoutSnapshot.edges,
    stepExecutionMap,
    transformed.bypassLaneNodes,
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
