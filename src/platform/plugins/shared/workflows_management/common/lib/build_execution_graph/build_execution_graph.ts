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
  EnterConditionBranchNode,
  ExitConditionBranchNode,
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
  trueSteps.forEach((ifTrueCurrentStep: any, index: number) => {
    const _previousStep = index > 0 ? trueSteps[index - 1] : enterThenBranchNode;
    const currentNode = visitAbstractStep(graph, _previousStep, ifTrueCurrentStep);
    graph.setNode(getNodeId(currentNode), currentNode);
    graph.setEdge(getNodeId(previousStep), getNodeId(currentNode));
  });
  const exitThenBranchNode: ExitConditionBranchNode = {
    id: `exitThen(${enterConditionNodeId})`,
    type: 'exit-condition-branch',
    startNodeId: enterThenBranchNode.id,
  };
  graph.setNode(exitThenBranchNode.id, exitThenBranchNode);
  graph.setEdge(getNodeId(trueSteps[trueSteps.length - 1]), exitThenBranchNode.id);
  graph.setEdge(exitThenBranchNode.id, exitConditionNode.id);

  if (falseSteps?.length > 0) {
    const enterElseBranchNode: EnterConditionBranchNode = {
      id: `enterElse(${enterConditionNodeId})`,
      type: 'enter-condition-branch',
    };
    graph.setNode(enterElseBranchNode.id, enterElseBranchNode);
    graph.setEdge(enterConditionNodeId, enterElseBranchNode.id);
    falseSteps.forEach((ifFalseCurrentStep: any, index: number) => {
      const _previousStep = index > 0 ? falseSteps[index - 1] : enterElseBranchNode;
      const currentNode = visitAbstractStep(graph, _previousStep, ifFalseCurrentStep);
      graph.setNode(getNodeId(currentNode), currentNode);
      graph.setEdge(getNodeId(previousStep), getNodeId(currentNode));
    });
    const exitElseBranchNode: ExitConditionBranchNode = {
      id: `exitElse(${enterConditionNodeId})`,
      type: 'exit-condition-branch',
      startNodeId: enterElseBranchNode.id,
    };
    graph.setNode(exitElseBranchNode.id, exitElseBranchNode);
    graph.setEdge(getNodeId(falseSteps[falseSteps.length - 1]), exitElseBranchNode.id);
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
    id: enterForeachNodeId + '_exit',
    startNodeId: enterForeachNodeId,
  };

  foreachNestedSteps.forEach((step: any, index: number) => {
    const _previousStep = index > 0 ? foreachNestedSteps[index - 1] : foreachStep;
    enterForeachNode.itemNodeIds.push(getNodeId(step));
    const currentNode = visitAbstractStep(graph, _previousStep, step);
    graph.setNode(getNodeId(currentNode), currentNode);
    graph.setEdge(getNodeId(previousStep), getNodeId(currentNode));
  });

  const lastNestedForeachStep = foreachNestedSteps[foreachNestedSteps.length - 1];

  graph.setNode(exitForeachNode.id, exitForeachNode);
  graph.setEdge(getNodeId(lastNestedForeachStep), exitForeachNode.id);
  graph.setNode(enterForeachNodeId, enterForeachNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterForeachNodeId);
  }

  return exitForeachNode;
}

export function convertToWorkflowGraph(workflow: WorkflowExecutionEngineModel): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  let previousStep: BaseStep | null = null;

  workflow.definition.workflow.steps.forEach((currentStep, index) => {
    previousStep = visitAbstractStep(graph, previousStep, currentStep);
  });

  return graph;
}

export function convertToSerializableGraph(graph: graphlib.Graph): any {
  return graphlib.json.write(graph); // GraphLib does not provide type information, so we use `any`
}
