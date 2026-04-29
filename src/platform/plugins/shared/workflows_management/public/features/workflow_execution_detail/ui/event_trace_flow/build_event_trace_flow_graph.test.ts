/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTriggerEventChainLinkDto } from '@kbn/workflows';
import {
  buildEventTraceFlowGraph,
  EVENT_TRACE_FLOW_NODE_TYPES,
} from './build_event_trace_flow_graph';

const dispatch = (
  eventId: string,
  triggerId: string,
  sourceExecutionId?: string
): WorkflowTriggerEventChainLinkDto['dispatch'] => ({
  '@timestamp': 't',
  eventId,
  triggerId,
  spaceId: 'default',
  subscriptions: [],
  payload: {},
  ...(sourceExecutionId ? { sourceExecutionId } : {}),
});

describe('buildEventTraceFlowGraph', () => {
  it('returns empty graph for empty chain', () => {
    expect(buildEventTraceFlowGraph([])).toEqual({ nodes: [], edges: [] });
  });

  it('builds external → dispatch → run for a single hop without emittedBy', () => {
    const chain: WorkflowTriggerEventChainLinkDto[] = [
      {
        dispatch: dispatch('e1', 't1'),
        triggeredExecutionId: 'run-1',
        triggeredWorkflowId: 'wf-1',
      },
    ];
    const { nodes, edges } = buildEventTraceFlowGraph(chain);
    expect(nodes).toHaveLength(3);
    expect(nodes[0].type).toBe(EVENT_TRACE_FLOW_NODE_TYPES.external);
    expect(nodes[1].type).toBe(EVENT_TRACE_FLOW_NODE_TYPES.dispatch);
    expect(nodes[2].type).toBe(EVENT_TRACE_FLOW_NODE_TYPES.run);
    expect((nodes[2].data as { showSourceHandle: boolean }).showSourceHandle).toBe(false);
    expect(edges).toHaveLength(2);
  });

  it('starts from parent run when first link has emittedByExecution', () => {
    const chain: WorkflowTriggerEventChainLinkDto[] = [
      {
        dispatch: dispatch('e1', 't1'),
        triggeredExecutionId: 'run-1',
        triggeredWorkflowId: 'wf-1',
        emittedByExecution: { workflowId: 'wf-p', executionId: 'run-p' },
      },
    ];
    const { nodes, edges } = buildEventTraceFlowGraph(chain);
    expect(nodes).toHaveLength(3);
    expect(nodes[0].type).toBe(EVENT_TRACE_FLOW_NODE_TYPES.run);
    expect(nodes[0].id).toContain('run-p');
    expect(nodes[1].type).toBe(EVENT_TRACE_FLOW_NODE_TYPES.dispatch);
    expect(edges).toHaveLength(2);
  });

  it('chains two hops with external root', () => {
    const chain: WorkflowTriggerEventChainLinkDto[] = [
      {
        dispatch: dispatch('e1', 't1'),
        triggeredExecutionId: 'run-a',
        triggeredWorkflowId: 'wf-a',
      },
      {
        dispatch: dispatch('e2', 't2', 'run-a'),
        triggeredExecutionId: 'run-b',
        triggeredWorkflowId: 'wf-b',
      },
    ];
    const { nodes, edges } = buildEventTraceFlowGraph(chain);
    expect(nodes).toHaveLength(5);
    expect(edges).toHaveLength(4);
    const runNodes = nodes.filter((n) => n.type === EVENT_TRACE_FLOW_NODE_TYPES.run);
    expect((runNodes[0].data as { showSourceHandle: boolean }).showSourceHandle).toBe(true);
    expect((runNodes[1].data as { showSourceHandle: boolean }).showSourceHandle).toBe(false);
  });

  it('lays out nodes top-to-bottom with increasing y', () => {
    const chain: WorkflowTriggerEventChainLinkDto[] = [
      {
        dispatch: dispatch('e1', 't1'),
        triggeredExecutionId: 'run-1',
        triggeredWorkflowId: 'wf-1',
      },
    ];
    const { nodes } = buildEventTraceFlowGraph(chain);
    const ys = nodes.map((n) => n.position.y);
    const sorted = [...ys].sort((a, b) => a - b);
    expect(ys).toEqual(sorted);
    expect(new Set(ys).size).toBe(ys.length);
  });
});
