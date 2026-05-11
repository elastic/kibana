/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node, OnNodesChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyGraphLayout,
  computeTopologyFingerprint,
  transformWorkflowToGraph,
} from '@kbn/workflows';
import type {
  ExecutionStatus,
  LayoutedNode,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';

interface UseWorkflowLayoutParams {
  workflow: WorkflowYaml | undefined;
  stepExecutions?: WorkflowStepExecutionDto[];
  searchTerm?: string;
  onPerfMark?: (name: 'transform_ms' | 'layout_ms', ms: number) => void;
  onLayoutFailed?: (reason: string) => void;
}

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

      const t1 = performance.now();
      const laid = applyGraphLayout(
        transformed.nodes,
        transformed.edges,
        transformed.foreachGroups
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on topology only
  }, [topologyFingerprint]);

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
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        parentId: n.parentId,
        extent: n.extent,
        style: { width: n.style.width, height: n.style.height },
        data: {
          ...(n.data as Record<string, unknown>),
          stepExecution: exec,
          matchesSearch,
          searchActive,
        },
      } as Node;
    });
  }, [layoutResult.nodes, stepExecutionMap, searchActive, lowerSearch]);

  const derivedEdges = useMemo<Edge[]>(() => {
    return layoutResult.edges.map((e) => {
      const targetExec = stepExecutionMap?.[e.target];
      const traversed = !!targetExec;
      const traversedStatus = targetExec?.status as ExecutionStatus | undefined;
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
  }, [layoutResult.edges, stepExecutionMap]);

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
