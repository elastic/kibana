/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { WorkflowTriggerEventChainLinkDto } from '@kbn/workflows';

/**
 * Single column width for every node so top/bottom handles share one vertical axis — straight
 * edges stay vertical instead of zig-zagging between narrow and wide nodes.
 */
export const EVENT_TRACE_FLOW_COLUMN_WIDTH = 220;

const EXTERNAL_NODE_ROW_HEIGHT = 40;
export const EVENT_TRACE_DISPATCH_NODE_ROW_HEIGHT = 64;
const RUN_NODE_MIN_HEIGHT = 72;
/** Layout height for run cells (non-current): title + execution id. */
const RUN_NODE_LAYOUT_HEIGHT = 80;
/** Layout height when "This run" badge is shown. */
const RUN_NODE_LAYOUT_HEIGHT_CURRENT = 100;

const LAYOUT_MARGIN_BOTTOM = 40;

export const EVENT_TRACE_FLOW_NODE_TYPES = {
  external: 'eventTraceExternal',
  dispatch: 'eventTraceDispatch',
  run: 'eventTraceRun',
} as const;

export interface EventTraceExternalNodeData {
  kind: 'external';
}

export interface EventTraceDispatchNodeData {
  kind: 'dispatch';
  triggerId: string;
  eventId: string;
  timestamp: string;
  subscriptions: string[];
  payloadJson: string;
}

export interface EventTraceRunNodeData {
  kind: 'run';
  workflowId: string;
  workflowName?: string;
  executionId: string;
  isCurrent: boolean;
  /** False for the final run in the chain (no outgoing edge). */
  showSourceHandle: boolean;
}

export type EventTraceFlowNodeData =
  | EventTraceExternalNodeData
  | EventTraceDispatchNodeData
  | EventTraceRunNodeData;

function getEventTraceNodeLayoutDimensions(node: Node<EventTraceFlowNodeData>): {
  width: number;
  height: number;
} {
  const width = EVENT_TRACE_FLOW_COLUMN_WIDTH;
  switch (node.data.kind) {
    case 'external':
      return { width, height: EXTERNAL_NODE_ROW_HEIGHT };
    case 'dispatch':
      return { width, height: EVENT_TRACE_DISPATCH_NODE_ROW_HEIGHT };
    case 'run':
      return {
        width,
        height: node.data.isCurrent ? RUN_NODE_LAYOUT_HEIGHT_CURRENT : RUN_NODE_LAYOUT_HEIGHT,
      };
    default:
      return { width, height: RUN_NODE_MIN_HEIGHT };
  }
}

function applyEventTraceDagreLayout(
  nodes: Node<EventTraceFlowNodeData>[],
  edges: Edge[]
): Node<EventTraceFlowNodeData>[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const dagreGraph = new graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',
    ranksep: 24,
    nodesep: 0,
    marginx: 20,
    marginy: 24,
    align: 'UL',
  });

  nodes.forEach((node) => {
    const { width, height } = getEventTraceNodeLayoutDimensions(node);
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: 0,
        y: dagreNode.y - dagreNode.height / 2,
      },
    };
  });
}

/**
 * Vertical space needed to fit laid-out nodes (after `buildEventTraceFlowGraph`), for the graph container.
 */
export function getEventTraceFlowGraphContentHeight(nodes: Node<EventTraceFlowNodeData>[]): number {
  if (nodes.length === 0) {
    return 0;
  }
  let maxBottom = 0;
  for (const node of nodes) {
    const { height } = getEventTraceNodeLayoutDimensions(node);
    maxBottom = Math.max(maxBottom, node.position.y + height);
  }
  return maxBottom + LAYOUT_MARGIN_BOTTOM;
}

function formatDispatchPayloadJson(payload: Record<string, unknown>): string {
  try {
    const text = JSON.stringify(payload, null, 2);
    const max = 1200;
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return '';
  }
}

/** Default edge interaction width (20px) overlaps the dispatch node and steals clicks; this graph is not edge-interactive. */
const solidEdge = (): Pick<Edge, 'animated' | 'interactionWidth' | 'style'> => ({
  animated: false,
  interactionWidth: 0,
  style: { strokeWidth: 2 },
});

/**
 * Linear top-to-bottom graph: external or parent run → dispatch → run → … → current run.
 */
export function buildEventTraceFlowGraph(chain: WorkflowTriggerEventChainLinkDto[]): {
  nodes: Node<EventTraceFlowNodeData>[];
  edges: Edge[];
} {
  if (chain.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node<EventTraceFlowNodeData>[] = [];
  const edges: Edge[] = [];

  let previousSourceId: string | null = null;

  const first = chain[0];
  if (first.emittedByExecution) {
    const emitterId = `trace-emitter-${first.emittedByExecution.executionId}`;
    nodes.push({
      id: emitterId,
      type: EVENT_TRACE_FLOW_NODE_TYPES.run,
      position: { x: 0, y: 0 },
      data: {
        kind: 'run',
        workflowId: first.emittedByExecution.workflowId,
        workflowName: first.emittedByExecution.workflowName,
        executionId: first.emittedByExecution.executionId,
        isCurrent: false,
        showSourceHandle: true,
      },
      style: { width: EVENT_TRACE_FLOW_COLUMN_WIDTH, minHeight: RUN_NODE_MIN_HEIGHT },
    });
    previousSourceId = emitterId;
  } else {
    const extId = 'trace-external-source';
    nodes.push({
      id: extId,
      type: EVENT_TRACE_FLOW_NODE_TYPES.external,
      position: { x: 0, y: 0 },
      data: { kind: 'external' },
      style: { width: EVENT_TRACE_FLOW_COLUMN_WIDTH, height: EXTERNAL_NODE_ROW_HEIGHT },
    });
    previousSourceId = extId;
  }

  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    const dispatchId = `trace-dispatch-${i}`;
    const runId = `trace-run-${i}`;
    const isCurrentRun = i === chain.length - 1;

    nodes.push({
      id: dispatchId,
      type: EVENT_TRACE_FLOW_NODE_TYPES.dispatch,
      position: { x: 0, y: 0 },
      data: {
        kind: 'dispatch',
        triggerId: link.dispatch.triggerId,
        eventId: link.dispatch.eventId,
        timestamp: link.dispatch['@timestamp'],
        subscriptions: link.dispatch.subscriptions,
        payloadJson: formatDispatchPayloadJson(link.dispatch.payload),
      },
      style: { width: EVENT_TRACE_FLOW_COLUMN_WIDTH, height: EVENT_TRACE_DISPATCH_NODE_ROW_HEIGHT },
    });

    if (previousSourceId) {
      edges.push({
        id: `e-${previousSourceId}-${dispatchId}`,
        source: previousSourceId,
        target: dispatchId,
        ...solidEdge(),
      });
    }

    nodes.push({
      id: runId,
      type: EVENT_TRACE_FLOW_NODE_TYPES.run,
      position: { x: 0, y: 0 },
      data: {
        kind: 'run',
        workflowId: link.triggeredWorkflowId,
        workflowName: link.triggeredWorkflowName,
        executionId: link.triggeredExecutionId,
        isCurrent: isCurrentRun,
        showSourceHandle: !isCurrentRun,
      },
      style: { width: EVENT_TRACE_FLOW_COLUMN_WIDTH, minHeight: RUN_NODE_MIN_HEIGHT },
    });

    edges.push({
      id: `e-${dispatchId}-${runId}`,
      source: dispatchId,
      target: runId,
      ...solidEdge(),
    });

    previousSourceId = runId;
  }

  return { nodes: applyEventTraceDagreLayout(nodes, edges), edges };
}
