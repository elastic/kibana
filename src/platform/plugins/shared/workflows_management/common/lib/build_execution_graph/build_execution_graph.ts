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
  EnterIfNode,
  ExitIfNode,
} from '@kbn/workflows';
import { omit } from 'lodash';

function getNodeId(node: BaseStep): string {
  // TODO: This is a workaround for the fact that some steps do not have an `id` field.
  // We should ensure that all steps have an `id` field in the future - either explicitly set or generated from name.
  return (node as any).id || node.name;
}

function visitAbstractStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const currentStepId = getNodeId(currentStep);

  if (currentStep.type === 'if') {
    return visitIfStep(graph, previousStep, currentStep);
  }

  graph.setNode(currentStep.id, currentStep);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), currentStepId);
  }

  return currentStep;
}

export function visitIfStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const enterIfNodeId = getNodeId(currentStep);
  const ifElseStep = currentStep as IfStep;
  const trueSteps: BaseStep[] = ifElseStep.steps || [];
  const falseSteps: BaseStep[] = ifElseStep.else || [];
  const ifElseNode: EnterIfNode = {
    id: enterIfNodeId,
    type: 'enter-if',
    trueNodeIds: [],
    falseNodeIds: [],
    configuration: {
      ...omit(ifElseStep, ['steps', 'else']), // No need to include them as they will be represented in the graph
    },
  };
  const ifElseEnd: ExitIfNode = {
    type: 'exit-if',
    id: enterIfNodeId + '_exit',
    startNodeId: enterIfNodeId,
  };

  trueSteps.forEach((ifTrueCurrentStep: any, index: number) => {
    const _previousStep = index > 0 ? trueSteps[index - 1] : ifElseStep;
    ifElseNode.trueNodeIds.push(ifTrueCurrentStep.id);
    const currentNode = visitAbstractStep(graph, _previousStep, ifTrueCurrentStep);
    graph.setNode(currentNode.id, currentNode);
    graph.setEdge(getNodeId(previousStep), currentNode.id);
  });

  falseSteps.forEach((ifFalseCurrentStep: any, index: number) => {
    const _previousStep = index > 0 ? falseSteps[index - 1] : ifElseStep;
    ifElseNode.falseNodeIds.push(ifFalseCurrentStep.id);
    const currentNode = visitAbstractStep(graph, _previousStep, ifFalseCurrentStep);
    graph.setNode(currentNode.id, currentNode);
    graph.setEdge(getNodeId(previousStep), currentNode.id);
  });

  const lastIfTrueStep = trueSteps[trueSteps.length - 1];
  const lastIfFalseStep = falseSteps[falseSteps.length - 1];

  graph.setNode(ifElseEnd.id, ifElseEnd);
  graph.setEdge(getNodeId(lastIfTrueStep), ifElseEnd.id);
  graph.setEdge(getNodeId(lastIfFalseStep), ifElseEnd.id);
  graph.setNode(enterIfNodeId, ifElseNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterIfNodeId);
  }

  return ifElseEnd;
}

export function convertToWorkflowGraph(workflow: WorkflowExecutionEngineModel): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  let previousStep: BaseStep | null = null;

  workflow.definition.workflow.steps.forEach((currentStep, index) => {
    previousStep = visitAbstractStep(graph, previousStep, currentStep);
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
