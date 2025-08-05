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
  ForEachStep,
  WorkflowExecutionEngineModel,
  EnterIfNode,
  ExitIfNode,
  EnterForeachNode,
  ExitForeachNode,
  WorkflowSchema,
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

  if (currentStep.type === 'foreach') {
    return visitForeachStep(graph, previousStep, currentStep);
  }

  graph.setNode(getNodeId(currentStep), currentStep);

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
    ifElseNode.trueNodeIds.push(getNodeId(ifTrueCurrentStep));
    const currentNode = visitAbstractStep(graph, _previousStep, ifTrueCurrentStep);
    graph.setNode(getNodeId(currentNode), currentNode);
    graph.setEdge(getNodeId(previousStep), getNodeId(currentNode));
  });

  falseSteps.forEach((ifFalseCurrentStep: any, index: number) => {
    const _previousStep = index > 0 ? falseSteps[index - 1] : ifElseStep;
    ifElseNode.falseNodeIds.push(getNodeId(ifFalseCurrentStep));
    const currentNode = visitAbstractStep(graph, _previousStep, ifFalseCurrentStep);
    graph.setNode(getNodeId(currentNode), currentNode);
    graph.setEdge(getNodeId(previousStep), getNodeId(currentNode));
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

function visitForeachStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const enterForeachNodeId = getNodeId(currentStep);
  const foreachStep = currentStep as ForEachStep;
  const foreachNestedSteps: BaseStep[] = foreachStep.steps || [];

  const enterForeachNode: EnterForeachNode = {
    id: enterForeachNodeId,
    type: 'enter-foreach',
    itemNodeIds: [],
    configuration: {
      ...omit(foreachStep, ['steps']), // No need to include them as they will be represented in the graph
    },
  };
  const exitForeachNode: ExitForeachNode = {
    type: 'exit-foreach',
    id: `exitForeach(${enterForeachNodeId})`,
    startNodeId: enterForeachNodeId,
  };

  let previousNodeToLink: any = enterForeachNode;
  foreachNestedSteps.forEach((step: any) => {
    enterForeachNode.itemNodeIds.push(getNodeId(step));
    const currentNode = visitAbstractStep(graph, previousNodeToLink, step);
    graph.setNode(getNodeId(currentNode), currentNode);
    graph.setEdge(getNodeId(previousNodeToLink), getNodeId(currentNode));
    previousNodeToLink = currentNode;
  });

  graph.setNode(exitForeachNode.id, exitForeachNode);
  graph.setEdge(getNodeId(previousNodeToLink), exitForeachNode.id);
  graph.setNode(enterForeachNodeId, enterForeachNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterForeachNodeId);
  }

  return exitForeachNode;
}

export function convertToWorkflowGraph(workflowSchema: WorkflowSchema): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  let previousStep: BaseStep | null = null;

  workflowSchema.steps.forEach((currentStep, index) => {
    previousStep = visitAbstractStep(graph, previousStep, currentStep);
  });

  return graph;
}

export function convertToSerializableGraph(graph: graphlib.Graph): any {
  return graphlib.json.write(graph); // GraphLib does not provide type information, so we use `any`
}
