/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import {
  BaseStep,
  IfStep,
  WorkflowExecutionEngineModel,
  ExecutionGraph,
  ExecutionGraphNode,
} from '@kbn/workflows';
import { omit } from 'lodash';
import { IfElseEndNode, IfElseNode } from './nodes/branching_nodes';

function getNodeId(node: BaseStep): string {
  return (node as any).id || node.name;
}

export function convertToWorkflowGraph(workflow: WorkflowExecutionEngineModel): graphlib.Graph {
  function visitStep(
    graph: graphlib.Graph,
    previousStep: any,
    currentStep: any,
    nextStep: any
  ): any {
    const currentStepId = getNodeId(currentStep);
    const previousStepId = getNodeId(previousStep);

    if (currentStep.type === 'if') {
      const ifElseStep = currentStep as IfStep;
      const trueSteps: BaseStep[] = ifElseStep.steps || [];
      const falseSteps: BaseStep[] = ifElseStep.else || [];
      const ifElseNode: IfElseNode = {
        ...omit(ifElseStep, ['steps', 'else']),
        id: currentStepId,
        trueNodeIds: [],
        falseNodeIds: [],
      };
      const ifElseStartId = currentStepId;
      const ifElseEnd: IfElseEndNode = {
        type: 'if-end',
        id: ifElseStartId + '_end',
        startNodeId: ifElseStartId,
      };

      let ifTruePreviousStep = ifElseStep;
      let ifTrueNextStep = trueSteps[0];
      trueSteps.forEach((ifTrueCurrentStep: any, index: number) => {
        ifElseNode.trueNodeIds.push(ifTrueCurrentStep.id);
        visitStep(graph, ifTruePreviousStep, ifTrueCurrentStep, ifTrueNextStep);
        ifTruePreviousStep = ifTrueCurrentStep;
        ifTrueNextStep = trueSteps[index + 1];
      });

      let ifFalsePreviousStep = ifElseStep;
      let ifFalseNextStep = falseSteps[0];
      falseSteps.forEach((ifFalseCurrentStep: any, index: number) => {
        ifElseNode.falseNodeIds.push(ifFalseCurrentStep.id);
        visitStep(graph, ifFalsePreviousStep, ifFalseCurrentStep, ifFalseNextStep);
        ifFalsePreviousStep = ifFalseCurrentStep;
        ifFalseNextStep = falseSteps[index + 1];
      });

      const lastIfTrueStep = trueSteps[trueSteps.length - 1];
      const lastIfFalseStep = falseSteps[falseSteps.length - 1];

      graph.setNode(ifElseEnd.id, ifElseEnd);
      graph.setEdge(getNodeId(lastIfTrueStep), ifElseEnd.id);
      graph.setEdge(getNodeId(lastIfFalseStep), ifElseEnd.id);
      graph.setNode(ifElseStartId, ifElseNode);

      if (previousStep) {
        graph.setEdge(previousStepId, ifElseStartId);
      }

      return ifElseEnd;
    }

    graph.setNode(currentStep.id, currentStep);

    if (previousStep) {
      graph.setEdge(previousStepId, currentStepId);
    }

    return currentStep;
  }

  const graph = new graphlib.Graph({ directed: true });
  let previousStep: BaseStep | null = null;

  workflow.definition.workflow.steps.forEach((currentStep, index) => {
    const nextStep =
      index < workflow.definition.workflow.steps.length - 1
        ? workflow.definition.workflow.steps[index + 1]
        : null;
    previousStep = visitStep(graph, previousStep, currentStep, nextStep);
  });

  return graph;
}

export function convertToSerializableGraph(graph: graphlib.Graph): ExecutionGraph {
  const result: Record<string, ExecutionGraphNode> = {};
  const nodes = graph.nodes();
  const topologicalOrder = graphlib.alg.topsort(graph);
  const topologicalOrderMap = new Map<string, number>(
    topologicalOrder.map((nodeId, index) => [nodeId, index])
  );
  for (const nodeId of nodes) {
    const prev = graph.predecessors(nodeId) || [];
    const next = graph.successors(nodeId) || [];

    const data = graph.node(nodeId);

    const flatNode: ExecutionGraphNode = {
      type: (data as any).type,
      id: (data as any).id,
      topologicalIndex: topologicalOrderMap.get(nodeId) as number,
      prev,
      next,
      data: data || {},
    };

    result[nodeId] = flatNode;
  }

  return {
    nodes: result,
    topologicalOrder,
  };
}
