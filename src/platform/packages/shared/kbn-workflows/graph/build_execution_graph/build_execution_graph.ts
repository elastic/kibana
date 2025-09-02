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
  WorkflowSettings,
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
interface GraphBuildContext {
  settings: WorkflowSettings | undefined;
  stack: string[];
}

interface FallbackStep extends BaseStep {
  name: string;
  type: 'fallback';
  normalPathSteps: BaseStep[];
  fallbackPathSteps: BaseStep[];
}

function getNodeId(node: BaseStep): string {
  // TODO: This is a workaround for the fact that some steps do not have an `id` field.
  // We should ensure that all steps have an `id` field in the future - either explicitly set or generated from name.
  return (node as any).id || node.name;
}

function visitAbstractStep(currentStep: BaseStep, context: GraphBuildContext): graphlib.Graph {
  if ((currentStep as StepWithOnFailure)['on-failure']) {
    const stepLevelOnFailureGraph = handleStepLevelOnFailure(currentStep, context);

    if (stepLevelOnFailureGraph) {
      return stepLevelOnFailureGraph;
    }
  }

  if (context.settings?.['on-failure']) {
    const workflowLevelOnFailureGraph = handleWorkflowLevelOnFailure(currentStep, context);

    if (workflowLevelOnFailureGraph) {
      return workflowLevelOnFailureGraph;
    }
  }

  if ((currentStep as StepWithIfCondition).if) {
    return createIfGraphForIfStepLevel(currentStep as StepWithIfCondition, context);
  }

  if ((currentStep as IfStep).type === 'if') {
    return createIfGraph(currentStep as IfStep, context);
  }

  if ((currentStep as StepWithForeach).foreach) {
    return createForeachGraphForStepWithForeach(currentStep as StepWithForeach, context);
  }

  if ((currentStep as ForEachStep).type === 'foreach') {
    return createForeachGraph(currentStep as ForEachStep, context);
  }

  if ((currentStep as WaitStep).type === 'wait') {
    return visitWaitStep(currentStep as WaitStep);
  }

  if ((currentStep as HttpStep).type === 'http') {
    return visitHttpStep(currentStep as HttpStep);
  }

  return visitAtomicStep(currentStep);
}

export function visitWaitStep(currentStep: any): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const waitNode: WaitGraphNode = {
    id: getNodeId(currentStep),
    type: 'wait',
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(waitNode.id, waitNode);

  return graph;
}

export function visitHttpStep(currentStep: any): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const httpNode: HttpGraphNode = {
    id: getNodeId(currentStep),
    type: 'http',
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(httpNode.id, httpNode);

  return graph;
}

export function visitAtomicStep(currentStep: any): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const atomicNode: AtomicGraphNode = {
    id: getNodeId(currentStep),
    type: 'atomic',
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(atomicNode.id, atomicNode);

  return graph;
}

function createIfGraph(ifStep: IfStep, context: GraphBuildContext): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterConditionNodeId = getNodeId(ifStep);
  const exitConditionNodeId = `exitCondition(${enterConditionNodeId})`;
  const ifElseStep = ifStep as IfStep;
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
  const exitThenBranchNode: ExitConditionBranchNode = {
    id: `exitThen(${enterConditionNodeId})`,
    type: 'exit-condition-branch',
    startNodeId: enterThenBranchNode.id,
  };
  const thenGraph = createStepsSequence(trueSteps, context);
  insertGraphBetweenNodes(graph, thenGraph, enterThenBranchNode.id, exitThenBranchNode.id);
  graph.setNode(exitThenBranchNode.id, exitThenBranchNode);
  graph.setEdge(exitThenBranchNode.id, exitConditionNode.id);

  if (falseSteps?.length > 0) {
    const enterElseBranchNode: EnterConditionBranchNode = {
      id: `enterElse(${enterConditionNodeId})`,
      type: 'enter-condition-branch',
    };
    graph.setNode(enterElseBranchNode.id, enterElseBranchNode);
    graph.setEdge(enterConditionNodeId, enterElseBranchNode.id);
    const exitElseBranchNode: ExitConditionBranchNode = {
      id: `exitElse(${enterConditionNodeId})`,
      type: 'exit-condition-branch',
      startNodeId: enterElseBranchNode.id,
    };
    const elseGraph = createStepsSequence(falseSteps, context);
    insertGraphBetweenNodes(graph, elseGraph, enterElseBranchNode.id, exitElseBranchNode.id);
    graph.setNode(exitElseBranchNode.id, exitElseBranchNode);
    graph.setEdge(exitElseBranchNode.id, exitConditionNode.id);
  }

  graph.setNode(exitConditionNode.id, exitConditionNode);
  graph.setNode(enterConditionNodeId, conditionNode);

  return graph;
}

function createIfGraphForIfStepLevel(
  stepWithIfCondition: StepWithIfCondition,
  context: GraphBuildContext
) {
  const ifStep: IfStep = {
    name: `if_${getNodeId(stepWithIfCondition as BaseStep)}`,
    type: 'if',
    condition: stepWithIfCondition.if,
    steps: [omit(stepWithIfCondition, ['if'])],
  } as IfStep;
  return createIfGraph(ifStep, context);
}

function visitOnFailure(
  currentStep: BaseStep,
  onFailureConfiguration: WorkflowOnFailure,
  context: GraphBuildContext
): any {
  const id = getNodeId(currentStep);
  const onFailureKey = `onFailure_${id}`;

  context.stack.push(onFailureKey);
  let graph = createStepsSequence(
    [
      {
        ...currentStep,
        ['on-failure']: undefined, // Remove 'on-failure' to avoid infinite recursion
      } as BaseStep,
    ],
    context
  );

  if (onFailureConfiguration?.retry) {
    graph = createRetry(id, graph, onFailureConfiguration.retry);
  }

  if (onFailureConfiguration.fallback?.length) {
    graph = createFallback(id, graph, onFailureConfiguration.fallback, context);
  }

  if (onFailureConfiguration.continue) {
    graph = createContinue(id, graph);
  }

  context.stack.pop();

  return graph;
}

function handleStepLevelOnFailure(
  step: BaseStep,
  context: GraphBuildContext
): graphlib.Graph | null {
  const stackKey = `stepLevelOnFailure_${getNodeId(step)}`;
  if (context.stack.includes(stackKey)) {
    return null;
  }
  context.stack.push(stackKey);
  const result = visitOnFailure(step, (step as StepWithOnFailure)['on-failure']!, context);
  context.stack.pop();
  return result;
}

function handleWorkflowLevelOnFailure(
  step: BaseStep,
  context: GraphBuildContext
): graphlib.Graph | null {
  const stackKey = `workflowLevelOnFailure_${getNodeId(step)}`;

  if (
    context.stack.includes(stackKey) || // Avoid recursion
    context.stack.includes(`stepLevelOnFailure_${getNodeId(step)}`) || // Avoid workflow-level on-failure if already in step-level on-failure
    context.stack.some((nodeId) => nodeId.startsWith('enterFallbackPath')) // Avoid workflo-level on-failure for steps inside fallback path
  ) {
    return null;
  }

  context.stack.push(`workflowLevelOnFailure_${getNodeId(step)}`);
  const result = visitOnFailure(step, context.settings!['on-failure']!, context);
  context.stack.pop();
  return result;
}

function createContinue(id: string, innerGraph: graphlib.Graph): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterContinueNodeId = `enterContinue_${id}`;
  const exitNodeId = `exitContinue_${id}`;
  const enterContinueNode: EnterContinueNode = {
    id: enterContinueNodeId,
    type: 'enter-continue',
    exitNodeId,
  };
  const exitContinueNode: ExitContinueNode = {
    type: 'exit-continue',
    id: exitNodeId,
  };
  graph.setNode(enterContinueNode.id, enterContinueNode);
  graph.setNode(exitContinueNode.id, exitContinueNode);
  insertGraphBetweenNodes(graph, innerGraph, enterContinueNode.id, exitContinueNode.id);
  return graph;
}

function createRetry(id: string, innerGraph: graphlib.Graph, retry: WorkflowRetry): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterRetryNodeId = `enterRetry_${id}`;
  const exitNodeId = `exitRetry_${id}`;
  const enterRetryNode: EnterRetryNode = {
    id: enterRetryNodeId,
    type: 'enter-retry',
    exitNodeId,
    configuration: retry,
  };
  const exitRetryNode: ExitRetryNode = {
    type: 'exit-retry',
    id: exitNodeId,
    startNodeId: enterRetryNodeId,
  };
  graph.setNode(enterRetryNode.id, enterRetryNode);
  graph.setNode(exitRetryNode.id, exitRetryNode);
  insertGraphBetweenNodes(graph, innerGraph, enterRetryNode.id, exitRetryNode.id);
  return graph;
}

function createNormalPath(id: string, normalPathGraph: graphlib.Graph): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterNormalPathNodeId = `enterNormalPath_${id}`;
  const exitNormalPathNodeId = `exitNormalPath_${id}`;
  const enterNormalPathNode: EnterNormalPathNode = {
    id: enterNormalPathNodeId,
    type: 'enter-normal-path',
    enterZoneNodeId: `enterTryBlock_${id}`,
    enterFailurePathNodeId: `enterFallbackPath_${id}`,
  };
  const exitNormalPathNode: ExitNormalPathNode = {
    id: exitNormalPathNodeId,
    type: 'exit-normal-path',
    enterNodeId: enterNormalPathNodeId,
    exitOnFailureZoneNodeId: `exitTryBlock_${id}`,
  };
  graph.setNode(enterNormalPathNode.id, enterNormalPathNode);
  graph.setNode(exitNormalPathNode.id, exitNormalPathNode);

  insertGraphBetweenNodes(graph, normalPathGraph, enterNormalPathNode.id, exitNormalPathNode.id);
  return graph;
}

function createFallbackPath(
  id: string,
  fallbackSteps: BaseStep[],
  context: GraphBuildContext
): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterFallbackPathNodeId = `enterFallbackPath_${id}`;
  context.stack.push(enterFallbackPathNodeId);
  const exitFallbackPathNodeId = `exitFallbackPath_${id}`;
  const enterFallbackPathNode: EnterFallbackPathNode = {
    id: enterFallbackPathNodeId,
    type: 'enter-fallback-path',
    enterZoneNodeId: enterFallbackPathNodeId,
  };
  const exitFallbackPathNode: ExitFallbackPathNode = {
    id: exitFallbackPathNodeId,
    type: 'exit-fallback-path',
    enterNodeId: enterFallbackPathNodeId,
    exitOnFailureZoneNodeId: `exitTryBlock_${id}`,
  };
  graph.setNode(enterFallbackPathNode.id, enterFallbackPathNode);
  graph.setNode(exitFallbackPathNode.id, exitFallbackPathNode);
  const fallbackPathGraph = createStepsSequence(fallbackSteps, context);
  insertGraphBetweenNodes(
    graph,
    fallbackPathGraph,
    enterFallbackPathNode.id,
    exitFallbackPathNode.id
  );
  context.stack.pop();
  return graph;
}

function createFallback(
  id: string,
  normalPathGraph: graphlib.Graph,
  fallbackPathSteps: BaseStep[],
  context: GraphBuildContext
): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterTryBlockNodeId = `enterTryBlock_${id}`;
  const exitTryBlockNodeId = `exitTryBlock_${id}`;
  const enterNormalPathNodeId = `enterNormalPath_${id}`;

  const enterTryBlockNode: EnterTryBlockNode = {
    id: enterTryBlockNodeId,
    exitNodeId: exitTryBlockNodeId,
    type: 'enter-try-block',
    enterNormalPathNodeId,
  };
  graph.setNode(enterTryBlockNodeId, enterTryBlockNode);
  const exitTryBlockNode: ExitTryBlockNode = {
    type: 'exit-try-block',
    id: exitTryBlockNodeId,
    enterNodeId: enterTryBlockNodeId,
  };
  graph.setNode(exitTryBlockNodeId, exitTryBlockNode);

  const normalPathGraphWithNodes = createNormalPath(id, normalPathGraph);
  insertGraphBetweenNodes(graph, normalPathGraphWithNodes, enterTryBlockNodeId, exitTryBlockNodeId);

  const fallbackPathGraph = createFallbackPath(id, fallbackPathSteps, context);
  insertGraphBetweenNodes(graph, fallbackPathGraph, enterTryBlockNodeId, exitTryBlockNodeId);

  return graph;
}

function createStepsSequence(steps: BaseStep[], context: GraphBuildContext): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });

  let previousGraph: graphlib.Graph | null = null;

  for (let i = 0; i < steps.length; i++) {
    const currentGraph = visitAbstractStep(steps[i], context);
    currentGraph.nodes().forEach((nodeId) => {
      graph.setNode(nodeId, currentGraph.node(nodeId));
    });
    currentGraph.edges().forEach((edgeObj) => {
      graph.setEdge(edgeObj.v, edgeObj.w);
    });

    if (previousGraph) {
      const previousEndNodes = previousGraph!
        .nodes()
        .filter((nodeId) => previousGraph!.outEdges(nodeId)?.length === 0);

      const currentStartNodes = currentGraph
        .nodes()
        .filter((nodeId) => currentGraph.inEdges(nodeId)?.length === 0);

      previousEndNodes.forEach((endNode) => {
        currentStartNodes.forEach((startNode) => {
          graph.setEdge(endNode, startNode);
        });
      });
    }

    previousGraph = currentGraph;
  }

  return graph;
}

function insertGraphBetweenNodes(
  graph: graphlib.Graph,
  subGraph: graphlib.Graph,
  startNodeId: string,
  endNodeId: string
): void {
  // Find all start nodes (no incoming edges) and end nodes (no outgoing edges)
  const startNodes = subGraph.nodes().filter((nodeId) => subGraph.inEdges(nodeId)?.length === 0);
  const endNodes = subGraph.nodes().filter((nodeId) => subGraph.outEdges(nodeId)?.length === 0);

  // Connect all start nodes to the main start node
  startNodes.forEach((startNode) => {
    graph.setEdge(startNodeId, startNode);
  });

  // Connect all end nodes to the main end node
  endNodes.forEach((endNode) => {
    graph.setEdge(endNode, endNodeId);
  });

  // Copy all nodes from subGraph to the main graph
  subGraph.nodes().forEach((nodeId) => {
    graph.setNode(nodeId, subGraph.node(nodeId));
  });

  // Copy all edges from subGraph to the main graph
  subGraph.edges().forEach((edgeObj) => {
    graph.setEdge(edgeObj.v, edgeObj.w);
  });
}

function createForeachGraph(foreachStep: ForEachStep, context: GraphBuildContext): any {
  const graph = new graphlib.Graph({ directed: true });
  const enterForeachNodeId = getNodeId(foreachStep);
  const exitNodeId = `exitForeach(${enterForeachNodeId})`;
  const enterForeachNode: EnterForeachNode = {
    id: enterForeachNodeId,
    type: 'enter-foreach',
    exitNodeId,
    configuration: {
      ...omit(foreachStep, ['steps']), // No need to include them as they will be represented in the graph
    },
  };
  graph.setNode(enterForeachNodeId, enterForeachNode);
  const exitForeachNode: ExitForeachNode = {
    type: 'exit-foreach',
    id: exitNodeId,
    startNodeId: enterForeachNodeId,
  };
  graph.setNode(exitNodeId, exitForeachNode);
  const innerGraph = createStepsSequence(foreachStep.steps || [], context);

  insertGraphBetweenNodes(graph, innerGraph, enterForeachNodeId, exitNodeId);

  return graph;
}

function createForeachGraphForStepWithForeach(
  stepWithForeach: StepWithForeach,
  context: GraphBuildContext
) {
  if ((stepWithForeach as BaseStep).type === 'foreach') {
    return createForeachGraph(stepWithForeach as ForEachStep, context);
  }

  const foreachStep: ForEachStep = {
    name: `foreach_${getNodeId(stepWithForeach as BaseStep)}`,
    type: 'foreach',
    foreach: stepWithForeach.foreach,
    steps: [omit(stepWithForeach, ['foreach'])],
  } as ForEachStep;
  return createForeachGraph(foreachStep, context);
}

export function convertToWorkflowGraph(workflowSchema: WorkflowYaml): graphlib.Graph {
  const context: GraphBuildContext = {
    settings: workflowSchema.settings,
    stack: [],
  };

  return createStepsSequence(workflowSchema.steps, context);
}

export function convertToSerializableGraph(graph: graphlib.Graph): any {
  return graphlib.json.write(graph); // GraphLib does not provide type information, so we use `any`
}
