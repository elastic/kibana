/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import { omit } from 'lodash';
import type {
  BaseStep,
  IfStep,
  ForEachStep,
  WorkflowYaml,
  WaitStep,
  WorkflowRetry,
} from '../../spec/schema';
import type {
  EnterIfNode,
  ExitIfNode,
  EnterForeachNode,
  ExitForeachNode,
  EnterConditionBranchNode,
  ExitConditionBranchNode,
  AtomicGraphNode,
  WaitGraphNode,
  EnterRetryNode,
  ExitRetryNode,
} from '../../types/execution';

/**
 * TODO: We don't have primitive RetryStep so far, but we may need it in the future.
 * For now, we only use it internally when building the graph from the workflow definition.
 * And only as a wrapper for steps that have 'on-failure' with 'retry' defined.
 */
interface RetryStep extends BaseStep {
  type: 'retry';
  steps: BaseStep[];
  retry: WorkflowRetry;
}

function getNodeId(node: BaseStep): string {
  // TODO: This is a workaround for the fact that some steps do not have an `id` field.
  // We should ensure that all steps have an `id` field in the future - either explicitly set or generated from name.
  return (node as any).id || node.name;
}

function visitAbstractStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const modifiedCurrentStep = handleStepLevelOperations(currentStep);
  if ((modifiedCurrentStep as IfStep).type === 'if') {
    return visitIfStep(graph, previousStep, modifiedCurrentStep);
  }

  if ((modifiedCurrentStep as ForEachStep).type === 'foreach') {
    return visitForeachStep(graph, previousStep, modifiedCurrentStep);
  }

  if ((modifiedCurrentStep as WaitStep).type === 'wait') {
    return visitWaitStep(graph, previousStep, modifiedCurrentStep);
  }

  if ((modifiedCurrentStep as RetryStep).type === 'retry') {
    // Retry steps are treated as atomic steps for graph purposes
    return visitRetryStep(graph, previousStep, modifiedCurrentStep as RetryStep);
  }

  return visitAtomicStep(graph, previousStep, modifiedCurrentStep);
}

export function visitWaitStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const waitNode: WaitGraphNode = {
    id: getNodeId(currentStep),
    type: 'wait',
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(waitNode.id, waitNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), waitNode.id);
  }

  return waitNode;
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

function visitRetryStep(graph: graphlib.Graph, previousStep: any, currentStep: RetryStep): any {
  const enterRetryNodeId = getNodeId(currentStep);
  const retryNestedSteps: BaseStep[] = currentStep.steps || [];
  const exitNodeId = `exitRetry(${enterRetryNodeId})`;
  const enterRetryNode: EnterRetryNode = {
    id: enterRetryNodeId,
    type: 'enter-retry',
    exitNodeId,
    configuration: currentStep.retry,
  };
  const exitRetryNode: ExitRetryNode = {
    type: 'exit-retry',
    id: exitNodeId,
    startNodeId: enterRetryNodeId,
  };

  let previousNodeToLink: any = enterRetryNode;
  retryNestedSteps.forEach(
    (step: any) => (previousNodeToLink = visitAbstractStep(graph, previousNodeToLink, step))
  );

  graph.setNode(exitRetryNode.id, exitRetryNode);
  graph.setEdge(getNodeId(previousNodeToLink), exitRetryNode.id);
  graph.setNode(enterRetryNodeId, enterRetryNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterRetryNodeId);
  }

  return exitRetryNode;
}

function visitForeachStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const enterForeachNodeId = getNodeId(currentStep);
  const foreachStep = currentStep as ForEachStep;
  const foreachNestedSteps: BaseStep[] = foreachStep.steps || [];
  const exitNodeId = `exitForeach(${enterForeachNodeId})`;
  const enterForeachNode: EnterForeachNode = {
    id: enterForeachNodeId,
    type: 'enter-foreach',
    itemNodeIds: [],
    exitNodeId,
    configuration: {
      ...omit(foreachStep, ['steps']), // No need to include them as they will be represented in the graph
    },
  };
  const exitForeachNode: ExitForeachNode = {
    type: 'exit-foreach',
    id: exitNodeId,
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

/**
 * Processes step-level operations for a given workflow step.
 *
 * This function handles conditional step-level operations (if, foreach, etc)
 * that are defined at the step level by wrapping the original step in appropriate
 * control flow steps.
 *
 * @param currentStep - The workflow step to process
 * @returns A potentially wrapped version of the input step that incorporates
 *          any step-level control flow operations (if/foreach)
 */
function handleStepLevelOperations(currentStep: BaseStep): BaseStep {
  /** !IMPORTANT!
   * The order of operations is important here.
   * The order affects what context will be available in the step if/foreach/etc operation.
   */

  if ((currentStep as BaseStep)?.['on-failure']?.retry) {
    // Wrap the current step in a retry step
    // and remove the retry from the current step's on-failure to avoid infinite nesting
    // The retry logic will be handled by the outer retry step
    // We keep other on-failure properties (like fallback-step, continue) on the inner step
    // so they can be handled if the retry attempts are exhausted
    return {
      name: `retry_${getNodeId(currentStep)}`,
      type: 'retry',
      steps: [
        handleStepLevelOperations({
          ...currentStep,
          'on-failure': omit(currentStep['on-failure'], ['retry']) as any,
        }),
      ],
      retry: (currentStep as BaseStep)['on-failure']?.retry,
    } as RetryStep;
  }

  // currentStep.type !== 'foreach' is needed to avoid double wrapping in foreach
  // when the step is already a foreach step
  if (currentStep.if) {
    const modifiedStep = omit(currentStep, ['if']);
    return {
      name: `if_${getNodeId(currentStep)}`,
      type: 'if',
      condition: currentStep.if,
      steps: [handleStepLevelOperations(modifiedStep)],
    } as IfStep;
  }

  if (currentStep.foreach && (currentStep as ForEachStep).type !== 'foreach') {
    const modifiedStep = omit(currentStep, ['foreach']);
    return {
      name: `foreach_${getNodeId(currentStep)}`,
      type: 'foreach',
      foreach: currentStep.foreach,
      steps: [handleStepLevelOperations(modifiedStep)],
    } as ForEachStep;
  }

  return currentStep;
}

export function convertToWorkflowGraph(workflowSchema: WorkflowYaml): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  let previousNode: any | null = null;

  workflowSchema.steps.forEach((currentStep, index) => {
    const transformedStep = handleStepLevelOperations(currentStep);
    const currentNode = visitAbstractStep(graph, previousNode, transformedStep);
    previousNode = currentNode;
  });

  return graph;
}

export function convertToSerializableGraph(graph: graphlib.Graph): any {
  return graphlib.json.write(graph); // GraphLib does not provide type information, so we use `any`
}
