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
  ReactFlowProvider,
} from '@xyflow/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import { useWorkflowLayout } from './use_workflow_layout';
import { WorkflowGraphBottomBar } from './workflow_graph_bottom_bar';
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

const DEFAULT_EDGE_OPTIONS = { type: 'workflowEdge' } as const;
const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;

export interface WorkflowGraphCanvasProps {
  workflow: WorkflowYaml | undefined;
  stepExecutions?: WorkflowStepExecutionDto[];
  isYamlValid: boolean;
  selectedStepId?: string;
  onStepSelect: (stepId: string | undefined) => void;
  onNodeClick?: (stepId: string, stepType: string) => void;
  onSearchUsed?: () => void;
  onLayoutFailed?: (reason: string) => void;
  onPerfMark?: (name: 'transform_ms' | 'layout_ms' | 'first_paint_ms', ms: number) => void;
  colorMode?: ColorMode;
}

function WorkflowGraphCanvasInner(props: WorkflowGraphCanvasProps) {
  const {
    workflow,
    stepExecutions,
    isYamlValid,
    selectedStepId,
    onStepSelect,
    onNodeClick,
    onSearchUsed,
    onLayoutFailed,
    onPerfMark,
    colorMode,
  } = props;
  const { euiTheme } = useEuiTheme();

  const [searchTerm, setSearchTerm] = useState('');

  const { nodes, edges, onNodesChange, triggerNodeIds, leafNodeIds } = useWorkflowLayout({
    workflow,
    stepExecutions,
    searchTerm,
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

  const dimmed = !isYamlValid;

  return (
    <div
      css={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: euiTheme.colors.backgroundBasePlain,
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
          opacity: dimmed ? 0.5 : 1,
          pointerEvents: dimmed ? 'none' : 'auto',
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
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          proOptions={PRO_OPTIONS}
          colorMode={colorMode}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background
            bgColor={euiTheme.colors.backgroundBasePlain}
            color={euiTheme.colors.textSubdued}
          />
          <MiniMap
            pannable
            zoomable
            style={{
              background: euiTheme.colors.backgroundBaseSubdued,
              border: `1px solid ${euiTheme.colors.borderBasePlain}`,
            }}
            nodeColor={() => euiTheme.colors.borderBaseSubdued}
          />
        </ReactFlow>
      </div>
      <WorkflowGraphBottomBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchUsed={onSearchUsed}
        triggerNodeIds={triggerNodeIds}
        leafNodeIds={leafNodeIds}
        onJumpTo={(id) => onStepSelect(id)}
      />
    </div>
  );
}

export function WorkflowGraphCanvas(props: WorkflowGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
