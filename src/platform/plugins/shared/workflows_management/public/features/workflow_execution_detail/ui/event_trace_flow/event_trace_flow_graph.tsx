/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ColorMode, EdgeTypes, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { WorkflowTriggerEventChainLinkDto } from '@kbn/workflows';
import {
  buildEventTraceFlowGraph,
  EVENT_TRACE_FLOW_NODE_TYPES,
} from './build_event_trace_flow_graph';
import { EventTraceExtendedStraightEdge } from './event_trace_extended_straight_edge';
import {
  EventTraceDispatchNode,
  EventTraceExternalNode,
  EventTraceRunNode,
} from './event_trace_flow_nodes';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  [EVENT_TRACE_FLOW_NODE_TYPES.external]: EventTraceExternalNode,
  [EVENT_TRACE_FLOW_NODE_TYPES.dispatch]: EventTraceDispatchNode,
  [EVENT_TRACE_FLOW_NODE_TYPES.run]: EventTraceRunNode,
} as const satisfies NodeTypes;

const edgeTypes = {
  eventTraceExtendedStraight: EventTraceExtendedStraightEdge,
} as const satisfies EdgeTypes;

const GRAPH_MIN_HEIGHT = 280;

export interface EventTraceFlowGraphProps {
  chain: WorkflowTriggerEventChainLinkDto[];
}

export const EventTraceFlowGraph = React.memo<EventTraceFlowGraphProps>(({ chain }) => {
  const { colorMode, euiTheme } = useEuiTheme();
  const { nodes, edges } = useMemo(() => buildEventTraceFlowGraph(chain), [chain]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef<(() => void) | null>(null);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    fitRef.current = () => {
      instance.fitView({ padding: 0.15, maxZoom: 1.25, minZoom: 0.2 });
    };
    setTimeout(() => fitRef.current?.(), 0);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      fitRef.current?.();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodes.length, edges.length]);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-test-subj="workflowEventTraceFlowGraph"
      css={[
        {
          width: '100%',
          flex: 1,
          minHeight: GRAPH_MIN_HEIGHT,
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: euiTheme.border.thin,
          borderColor: euiTheme.border.color,
          borderRadius: euiTheme.border.radius.medium,
          overflow: 'hidden',
        },
        css`
          .react-flow__edge {
            pointer-events: none !important;
          }
          .react-flow__handle {
            opacity: 0 !important;
            background: transparent !important;
            border-color: transparent !important;
          }
        `,
      ]}
    >
      <ReactFlow
        style={{ width: '100%', height: '100%', flex: 1, minHeight: 0 }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as unknown as NodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
        colorMode={colorMode.toLowerCase() as ColorMode}
        defaultEdgeOptions={{
          type: 'eventTraceExtendedStraight',
          style: {
            stroke: euiTheme.colors.primary,
            strokeWidth: 2,
            strokeLinecap: 'round',
          },
        }}
      >
        <Controls orientation="horizontal" showInteractive={false} />
        <Background
          gap={20}
          size={1}
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          color={euiTheme.colors.borderBaseSubdued}
        />
      </ReactFlow>
    </div>
  );
});

EventTraceFlowGraph.displayName = 'EventTraceFlowGraph';
