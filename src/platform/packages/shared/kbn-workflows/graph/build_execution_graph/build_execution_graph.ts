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
  ForEachStep,
  HttpStep,
  IfStep,
  WaitStep,
  WorkflowYaml,
  WorkflowRetry,
  StepWithOnFailure,
  StepWithIfCondition,
  StepWithForeach,
  WorkflowOnFailure,
} from '../../spec/schema';
import type {
  AtomicGraphNode,
  EnterConditionBranchNode,
  EnterForeachNode,
  EnterIfNode,
  ExitConditionBranchNode,
  ExitForeachNode,
  ExitIfNode,
  HttpGraphNode,
  WaitGraphNode,
  EnterRetryNode,
  ExitRetryNode,
  EnterContinueNode,
  ExitContinueNode,
  EnterTryBlockNode,
  ExitTryBlockNode,
  EnterNormalPathNode,
  ExitNormalPathNode,
  EnterFallbackPathNode,
  ExitFallbackPathNode,
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

interface ContinueStep extends BaseStep {
  name: string;
  type: 'continue';
  steps: BaseStep[];
}

interface FallbackStep extends BaseStep {
  name: string;
  type: 'fall-back';
  normalPathSteps: BaseStep[];
  fallbackPathSteps: BaseStep[];
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

  if ((modifiedCurrentStep as HttpStep).type === 'http') {
    return visitHttpStep(graph, previousStep, modifiedCurrentStep);
  }

  if ((modifiedCurrentStep as ContinueStep).type === 'continue') {
    return visitContinueStep(graph, previousStep, modifiedCurrentStep as ContinueStep);
  }

  if ((modifiedCurrentStep as RetryStep).type === 'retry') {
    // Retry steps are treated as atomic steps for graph purposes
    return visitRetryStep(graph, previousStep, modifiedCurrentStep as RetryStep);
  }

  if ((modifiedCurrentStep as FallbackStep).type === 'fall-back') {
    return visitFallbackStep(graph, previousStep, modifiedCurrentStep as FallbackStep);
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

export function visitHttpStep(graph: graphlib.Graph, previousStep: any, currentStep: any): any {
  const httpNode: HttpGraphNode = {
    id: getNodeId(currentStep),
    type: 'http',
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(httpNode.id, httpNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), httpNode.id);
  }

  return httpNode;
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

export function visitFallbackStep(
  graph: graphlib.Graph,
  previousStep: any,
  currentStep: FallbackStep
): any {
  const enterTryBlockNodeId = getNodeId(currentStep);
  const exitTryBlockNodeId = `exitTryBlock(${enterTryBlockNodeId})`;
  const normalPathSteps: BaseStep[] = currentStep.normalPathSteps || [];
  const fallbackPathSteps: BaseStep[] = currentStep.fallbackPathSteps || [];
  const enterNormalPathNodeId = `normalPath_${enterTryBlockNodeId}`;
  const exitNormalPathNodeId = `exit_${enterNormalPathNodeId}`;
  const enterFallbackPathNodeId = `fallbackPath_${enterTryBlockNodeId}`;
  const exitFallbackPathNodeId = `exit_${enterFallbackPathNodeId}`;

  const enterTryBlockNode: EnterTryBlockNode = {
    id: enterTryBlockNodeId,
    exitNodeId: exitTryBlockNodeId,
    type: 'enter-try-block',
    enterNormalPathNodeId,
  };
  const exitTryBlockNode: ExitTryBlockNode = {
    type: 'exit-try-block',
    id: exitTryBlockNodeId,
    enterNodeId: enterTryBlockNodeId,
  };
  const enterNormalPathNode: EnterNormalPathNode = {
    id: enterTryBlockNode.enterNormalPathNodeId,
    type: 'enter-normal-path',
    enterZoneNodeId: enterTryBlockNode.id,
    enterFailurePathNodeId: enterFallbackPathNodeId,
  };

  graph.setNode(enterNormalPathNode.id, enterNormalPathNode);
  graph.setEdge(enterTryBlockNodeId, enterNormalPathNode.id);
  let thenPreviousStep: any = enterNormalPathNode;
  normalPathSteps.forEach(
    (ifTrueCurrentStep: any) =>
      (thenPreviousStep = visitAbstractStep(graph, thenPreviousStep, ifTrueCurrentStep))
  );
  const exitNormalPathNode: ExitNormalPathNode = {
    id: exitNormalPathNodeId,
    type: 'exit-normal-path',
    enterNodeId: enterTryBlockNode.enterNormalPathNodeId,
    exitOnFailureZoneNodeId: exitTryBlockNode.id,
  };
  graph.setNode(exitNormalPathNode.id, exitNormalPathNode);
  graph.setEdge(getNodeId(thenPreviousStep), exitNormalPathNode.id);
  graph.setEdge(exitNormalPathNode.id, exitTryBlockNode.id);

  if (fallbackPathSteps?.length > 0) {
    const enterFallbackPathNode: EnterFallbackPathNode = {
      id: enterFallbackPathNodeId,
      type: 'enter-failure-path',
      enterZoneNodeId: enterTryBlockNode.id,
    };
    graph.setNode(enterFallbackPathNode.id, enterFallbackPathNode);
    graph.setEdge(enterTryBlockNodeId, enterFallbackPathNode.id);
    let elsePreviousStep: any = enterFallbackPathNode;
    fallbackPathSteps.forEach(
      (ifFalseCurrentStep: any) =>
        (elsePreviousStep = visitAbstractStep(graph, elsePreviousStep, ifFalseCurrentStep))
    );
    const exitFallbackPathNode: ExitFallbackPathNode = {
      id: exitFallbackPathNodeId,
      type: 'exit-failure-path',
      enterNodeId: enterFallbackPathNodeId,
      exitOnFailureZoneNodeId: exitTryBlockNode.id,
    };
    graph.setNode(exitFallbackPathNode.id, exitFallbackPathNode);
    graph.setEdge(getNodeId(elsePreviousStep), exitFallbackPathNode.id);
    graph.setEdge(exitFallbackPathNode.id, exitTryBlockNode.id);
  }

  graph.setNode(exitTryBlockNode.id, exitTryBlockNode);
  graph.setNode(enterTryBlockNodeId, enterTryBlockNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterTryBlockNodeId);
  }

  return exitTryBlockNode;
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

function visitContinueStep(
  graph: graphlib.Graph,
  previousStep: any,
  currentStep: ContinueStep
): any {
  const enterContinueNodeId = getNodeId(currentStep);
  const retryNestedSteps: BaseStep[] = currentStep.steps || [];
  const exitNodeId = `exitContinue(${enterContinueNodeId})`;
  const enterContinueNode: EnterContinueNode = {
    id: enterContinueNodeId,
    type: 'enter-continue',
    exitNodeId,
  };
  const exitContinueNode: ExitContinueNode = {
    type: 'exit-continue',
    id: exitNodeId,
  };

  let previousNodeToLink: any = enterContinueNode;
  retryNestedSteps.forEach(
    (step: any) => (previousNodeToLink = visitAbstractStep(graph, previousNodeToLink, step))
  );

  graph.setNode(exitContinueNode.id, exitContinueNode);
  graph.setEdge(getNodeId(previousNodeToLink), exitContinueNode.id);
  graph.setNode(enterContinueNodeId, enterContinueNode);

  if (previousStep) {
    graph.setEdge(getNodeId(previousStep), enterContinueNodeId);
  }

  return exitContinueNode;
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

  if ((currentStep as StepWithOnFailure)?.['on-failure']) {
    const stepWithOnFailure = currentStep as StepWithOnFailure;
    const onFailureConfig = stepWithOnFailure['on-failure']!;

    if (onFailureConfig?.continue) {
      // Wrap the current step in a continue step
      // and remove the continue from the current step's on-failure to avoid infinite nesting
      // The continue logic will be handled by the outer continue step
      // We keep other on-failure properties (like fallback-step, retry) on the inner step
      // so they can be handled if needed
      return {
        name: `continue_${getNodeId(currentStep)}`,
        type: 'continue',
        steps: [
          handleStepLevelOperations({
            ...currentStep,
            'on-failure': omit(onFailureConfig, ['continue']) as WorkflowOnFailure,
          } as BaseStep),
        ],
      } as ContinueStep;
    }

    if (onFailureConfig.fallback) {
      // Wrap the current step in a fallback step
      // and remove the fallback-step from the current step's on-failure to avoid infinite nesting
      const fallbackSteps = onFailureConfig.fallback;
      return {
        name: `fallback_${getNodeId(currentStep)}`,
        type: 'fall-back',
        normalPathSteps: [
          handleStepLevelOperations({
            ...currentStep,
            'on-failure': omit(onFailureConfig, ['fallback']) as WorkflowOnFailure,
          } as BaseStep),
        ],
        fallbackPathSteps: Array.isArray(fallbackSteps) ? fallbackSteps : [fallbackSteps],
      } as FallbackStep;
    }

    if (onFailureConfig?.retry) {
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
            'on-failure': omit(onFailureConfig, ['retry']) as WorkflowOnFailure,
          } as BaseStep),
        ],
        retry: onFailureConfig.retry,
      } as RetryStep;
    }
  }

  if ((currentStep as StepWithIfCondition).if) {
    const stepWithIfCondition = currentStep as StepWithIfCondition;
    const modifiedStep = omit(stepWithIfCondition, ['if']) as BaseStep;
    return {
      name: `if_${getNodeId(currentStep)}`,
      type: 'if',
      condition: stepWithIfCondition.if,
      steps: [handleStepLevelOperations(modifiedStep)],
    } as IfStep;
  }

  // currentStep.type !== 'foreach' is needed to avoid double wrapping in foreach
  // when the step is already a foreach step
  if ((currentStep as StepWithForeach).foreach && (currentStep as ForEachStep).type !== 'foreach') {
    const stepWithForeach = currentStep as StepWithForeach;
    const modifiedStep = omit(stepWithForeach, ['foreach']) as BaseStep;
    return {
      name: `foreach_${getNodeId(currentStep)}`,
      type: 'foreach',
      foreach: stepWithForeach.foreach,
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
