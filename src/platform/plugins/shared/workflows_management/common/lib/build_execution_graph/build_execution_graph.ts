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
  EnterIfNode,
  ExitIfNode,
  EnterForeachNode,
  ExitForeachNode,
  EnterConditionBranchNode,
  ExitConditionBranchNode,
  AtomicGraphNode,
  WorkflowYaml,
} from '@kbn/workflows';
import { omit } from 'lodash';

function getNodeId(node: BaseStep): string {
  // TODO: This is a workaround for the fact that some steps do not have an `id` field.
  // We should ensure that all steps have an `id` field in the future - either explicitly set or generated from name.
  return (node as any).id || node.name;
}

function visitAbstractStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  if (currentStep.type === 'if') {
    return visitIfStep(graph, previousStep, currentStep);
  }

  if (currentStep.type === 'foreach') {
    return visitForeachStep(graph, previousStep, currentStep);
  }

  return visitAtomicStep(graph, previousStep, currentStep);
}

export function visitAtomicStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const atomicNode: AtomicGraphNode = {
    id: getNodeId(currentStep),
    type: 'atomic',
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(atomicNode.id, atomicNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), atomicNode.id);
  }

  return atomicNode;
}

export function visitIfStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const enterConditionNodeId = getNodeId(currentStep);
  const exitConditionNodeId = `exitCondition(${enterConditionNodeId})`;
  const ifElseStep = currentStep as IfStep;
  const trueSteps: BaseStep[] = ifElseStep.steps || [];
  const falseSteps: BaseStep[] = ifElseStep.else || [];

  const conditionNode: EnterIfNode = {
    id: enterConditionNodeId,
    exitNodeId: exitConditionNodeId,
    type: 'enter-if',
    configuration: {
      ...omit(ifElseStep, ['steps', 'else']), // No need to include them as they will be represented in the graph
    },
  };
  const exitConditionNode: ExitIfNode = {
    type: 'exit-if',
    id: exitConditionNodeId,
    startNodeId: enterConditionNodeId,
  };
  const enterThenBranchNode: EnterConditionBranchNode = {
    id: `enterThen(${enterConditionNodeId})`,
    type: 'enter-condition-branch',
    condition: ifElseStep.condition,
  };

  graph.setNode(enterThenBranchNode.id, enterThenBranchNode);
  graph.setEdge(enterConditionNodeId, enterThenBranchNode.id);
  let thenPreviousStep: any = enterThenBranchNode;
  trueSteps.forEach((ifTrueCurrentStep: any) => {
    const currentNode = visitAbstractStep(graph, thenPreviousStep, ifTrueCurrentStep);
    graph.setNode(getNodeId(currentNode), currentNode);
    graph.setEdge(getNodeId(thenPreviousStep), getNodeId(currentNode));
    thenPreviousStep = currentNode;
  });
  const exitThenBranchNode: ExitConditionBranchNode = {
    id: `exitThen(${enterConditionNodeId})`,
    type: 'exit-condition-branch',
    startNodeId: enterThenBranchNode.id,
  };
  graph.setNode(exitThenBranchNode.id, exitThenBranchNode);
  graph.setEdge(getNodeId(thenPreviousStep), exitThenBranchNode.id);
  graph.setEdge(exitThenBranchNode.id, exitConditionNode.id);

  if (falseSteps?.length > 0) {
    const enterElseBranchNode: EnterConditionBranchNode = {
      id: `enterElse(${enterConditionNodeId})`,
      type: 'enter-condition-branch',
    };
    graph.setNode(enterElseBranchNode.id, enterElseBranchNode);
    graph.setEdge(enterConditionNodeId, enterElseBranchNode.id);
    let elsePreviousStep: any = enterElseBranchNode;
    falseSteps.forEach((ifFalseCurrentStep: any) => {
      const currentNode = visitAbstractStep(graph, elsePreviousStep, ifFalseCurrentStep);
      graph.setNode(getNodeId(currentNode), currentNode);
      graph.setEdge(getNodeId(elsePreviousStep), getNodeId(currentNode));
      elsePreviousStep = currentNode;
    });
    const exitElseBranchNode: ExitConditionBranchNode = {
      id: `exitElse(${enterConditionNodeId})`,
      type: 'exit-condition-branch',
      startNodeId: enterElseBranchNode.id,
    };
    graph.setNode(exitElseBranchNode.id, exitElseBranchNode);
    graph.setEdge(getNodeId(elsePreviousStep), exitElseBranchNode.id);
    graph.setEdge(exitElseBranchNode.id, exitConditionNode.id);
  }

  graph.setNode(exitConditionNode.id, exitConditionNode);
  graph.setNode(enterConditionNodeId, conditionNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterConditionNodeId);
  }

  return exitConditionNode;
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

export function convertToWorkflowGraph(workflowSchema: WorkflowYaml): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  let previousNode: any | null = null;

  workflowSchema.steps.forEach((currentStep, index) => {
    const currentNode = visitAbstractStep(graph, previousNode, currentStep);
    previousNode = currentNode;
  });

  return graph;
}

export function convertToSerializableGraph(graph: graphlib.Graph): any {
  return graphlib.json.write(graph); // GraphLib does not provide type information, so we use `any`
}
