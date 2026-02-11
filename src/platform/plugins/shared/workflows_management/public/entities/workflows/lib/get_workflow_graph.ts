/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// TODO: remove eslint exceptions once we have a better way to handle this
/* eslint-disable @typescript-eslint/no-explicit-any */

import { graphlib } from '@dagrejs/dagre';
import type { WorkflowYaml } from '@kbn/workflows';
import { getTriggerLabel } from '../../../shared/lib/graph_utils';

export type WorkflowGraphNodeType =
  | 'if'
  | 'merge'
  | 'parallel'
  | 'action'
  | 'foreach'
  | 'atomic'
  | 'http'
  | 'trigger';

export interface WorkflowGraphNodeLabel {
  label: {
    stepType: string;
    label: string;
  };
  type: WorkflowGraphNodeType;
}

export type WorkflowGraph = graphlib.Graph<WorkflowGraphNodeLabel>;

export const flowNodeTypes = ['if', 'merge', 'parallel', 'foreach', 'atomic', 'http', 'trigger'];

function transformYamlToNodesAndEdges(
  triggers: WorkflowYaml['triggers'],
  steps: WorkflowYaml['steps']
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
      if ((step.steps as unknown[]).length > 0) {
        const firstNestedId = (step.steps as any[])[0].name.toLowerCase().replace(/\s+/g, '-');
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

export function getWorkflowGraph<T extends WorkflowYaml>(workflow: T) {
  const { nodes, edges } = transformYamlToNodesAndEdges(
    workflow.triggers ?? [],
    workflow.steps ?? []
  );

  const dagreGraph = new graphlib.Graph<WorkflowGraphNodeLabel>();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      label: node.data,
      type: node.type,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, {
      label: edge.id,
    });
  });

  return dagreGraph;
}
