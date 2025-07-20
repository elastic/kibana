/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import { Position } from '@xyflow/react';
import { WorkflowYaml } from '@kbn/workflows';

export type NodeType = 'if' | 'merge' | 'parallel' | 'action' | 'foreach' | 'atomic' | 'trigger';

export const flowNodeTypes = ['if', 'merge', 'parallel', 'foreach', 'atomic', 'merge', 'trigger'];

function getTriggerLabel(triggerType: string) {
  switch (triggerType) {
    case 'triggers.elastic.manual':
      return 'Manual';
    case 'triggers.elastic.detectionRule':
      return 'Detection Rule';
    case 'triggers.elastic.scheduled':
      return 'Scheduled';
    default:
      return triggerType;
  }
}

export function transformYamlToNodesAndEdges(
  triggers: WorkflowYaml['workflow']['triggers'],
  steps: WorkflowYaml['workflow']['steps']
) {
  const nodes: any[] = [];
  const edges: any[] = [];

  const firstStepId = steps?.[0]?.name.toLowerCase().replace(/\s+/g, '-');

  for (const trigger of triggers) {
    const id = trigger.type.toLowerCase().replace(/\s+/g, '-');
    const name = trigger.type;
    nodes.push({
      id,
      label: name,
      type: 'trigger',
      data: {
        stepType: trigger.type,
        label: getTriggerLabel(trigger.type),
      },
      style: {
        width: 250,
        height: 64,
      },
    });
    edges.push({
      id: `${id}:${firstStepId}`,
      source: id,
      target: firstStepId,
    });
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const id = step.name.toLowerCase().replace(/\s+/g, '-');
    const name = step.name;

    const nodeType = flowNodeTypes.includes(step.type) ? step.type : 'action';

    nodes.push({
      id,
      data: {
        label: name,
        stepType: step.type,
        step,
      },
      type: nodeType,
      style: {
        width: 250,
        height: 64,
      },
    });

    // Create edge to next step at the same level
    if (i < steps.length - 1) {
      const nextStep = steps[i + 1];
      const nextId = nextStep.name.toLowerCase().replace(/\s+/g, '-');
      edges.push({
        id: `${id}:${nextId}`,
        source: id,
        target: nextId,
      });
    }

    // Handle recursive step types
    if (step.type === 'if' && 'steps' in step && step.steps) {
      const { nodes: ifNodes, edges: ifEdges } = transformYamlToNodesAndEdges(
        [],
        step.steps as any
      );
      nodes.push(...ifNodes);
      edges.push(...ifEdges);

      // Create edge from if step to first nested step
      if (step.steps.length > 0) {
        const firstNestedId = step.steps[0].name.toLowerCase().replace(/\s+/g, '-');
        edges.push({
          id: `${id}:${firstNestedId}`,
          source: id,
          target: firstNestedId,
        });
      }

      // Handle else branch if it exists
      if ('else' in step && step.else) {
        const { nodes: elseNodes, edges: elseEdges } = transformYamlToNodesAndEdges(
          [],
          step.else as any
        );
        nodes.push(...elseNodes);
        edges.push(...elseEdges);

        // Create edge from if step to first else step
        if (step.else.length > 0) {
          const firstElseId = step.else[0].name.toLowerCase().replace(/\s+/g, '-');
          edges.push({
            id: `${id}:${firstElseId}-else`,
            source: id,
            target: firstElseId,
          });
        }
      }
    }

    if (step.type === 'foreach' && 'steps' in step && step.steps) {
      const { nodes: foreachNodes, edges: foreachEdges } = transformYamlToNodesAndEdges(
        [],
        step.steps as any
      );
      nodes.push(...foreachNodes);
      edges.push(...foreachEdges);

      // Create edge from foreach step to first nested step
      if (step.steps.length > 0) {
        const firstNestedId = step.steps[0].name.toLowerCase().replace(/\s+/g, '-');
        edges.push({
          id: `${id}:${firstNestedId}`,
          source: id,
          target: firstNestedId,
        });
      }
    }

    if (step.type === 'atomic' && 'steps' in step && step.steps) {
      const { nodes: atomicNodes, edges: atomicEdges } = transformYamlToNodesAndEdges(
        [],
        step.steps as any
      );
      nodes.push(...atomicNodes);
      edges.push(...atomicEdges);

      // Create edge from atomic step to first nested step
      if (step.steps.length > 0) {
        const firstNestedId = step.steps[0].name.toLowerCase().replace(/\s+/g, '-');
        edges.push({
          id: `${id}:${firstNestedId}`,
          source: id,
          target: firstNestedId,
        });
      }
    }

    if (step.type === 'parallel' && 'branches' in step && step.branches) {
      for (const branch of step.branches) {
        const { nodes: branchNodes, edges: branchEdges } = transformYamlToNodesAndEdges(
          [],
          branch.steps as any
        );
        nodes.push(...branchNodes);
        edges.push(...branchEdges);

        // Create edge from parallel step to first step in each branch
        if (branch.steps.length > 0) {
          const firstBranchId = branch.steps[0].name.toLowerCase().replace(/\s+/g, '-');
          edges.push({
            id: `${id}:${firstBranchId}`,
            source: id,
            target: firstBranchId,
          });
        }
      }
    }

    if (step.type === 'merge' && 'steps' in step && step.steps) {
      const { nodes: mergeNodes, edges: mergeEdges } = transformYamlToNodesAndEdges(
        [],
        step.steps as any
      );
      nodes.push(...mergeNodes);
      edges.push(...mergeEdges);

      // Create edge from merge step to first nested step
      if (step.steps.length > 0) {
        const firstNestedId = step.steps[0].name.toLowerCase().replace(/\s+/g, '-');
        edges.push({
          id: `${id}:${firstNestedId}`,
          source: id,
          target: firstNestedId,
        });
      }
    }
  }

  return {
    nodes,
    edges,
  };
}

export function getLayoutedNodesAndEdges(workflowDefinition: WorkflowYaml) {
  const { nodes, edges } = transformYamlToNodesAndEdges(
    workflowDefinition.workflow.triggers,
    workflowDefinition.workflow.steps
  );

  const dagreGraph = new graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph direction and spacing
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 40,
    ranksep: 40,
    edgesep: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      label: node.label,
      width: node.style.width,
      height: node.style.height,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, {
      label: edge.id,
    });
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      style: {
        ...node.style,
        width: dagreNode.width as number,
        height: dagreNode.height as number,
      },
      // Dagre provides positions with the center of the node as origin
      position: {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}
