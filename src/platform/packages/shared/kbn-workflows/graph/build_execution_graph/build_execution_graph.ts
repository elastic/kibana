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
  ElasticsearchStep,
  KibanaStep,
  WorkflowYaml,
  WorkflowRetry,
  StepWithOnFailure,
  StepWithIfCondition,
  StepWithForeach,
  WorkflowSettings,
  WorkflowOnFailure,
} from '../../spec/schema';
import type {
  GraphNode,
  AtomicGraphNode,
  EnterConditionBranchNode,
  EnterForeachNode,
  EnterIfNode,
  ExitConditionBranchNode,
  ExitForeachNode,
  ExitIfNode,
  HttpGraphNode,
  WaitGraphNode,
  ElasticsearchGraphNode,
  KibanaGraphNode,
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
} from '../types';

const flowControlStepTypes = new Set(['if', 'foreach']);
const disallowedWorkflowLevelOnFailureSteps = new Set(['wait']);

/** Context used during the graph construction to keep track of settings and avoid cycles */
interface GraphBuildContext {
  /** Workflow settings to be used during nodes construction */
  settings: WorkflowSettings | undefined;

  /**
   * Stack of nodes to keep track of the current position in the graph and avoid cycles
   */
  stack: GraphNode[];

  /** Used to construct predictable unique node IDs */
  parentKey: string;
}

function getStepId(node: BaseStep, context: GraphBuildContext): string {
  // TODO: This is a workaround for the fact that some steps do not have an `id` field.
  // We should ensure that all steps have an `id` field in the future - either explicitly set or generated from name.
  const nodeId = (node as any).id || node.name;
  const parts = [];

  if (context.parentKey) {
    parts.push(context.parentKey);
  }

  parts.push(nodeId);

  return parts.join('_');
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
    return createIfGraph(getStepId(currentStep, context), currentStep as IfStep, context);
  }

  if ((currentStep as ForEachStep).type === 'foreach') {
    return createForeachGraph(getStepId(currentStep, context), currentStep as ForEachStep, context);
  }

  if ((currentStep as StepWithForeach).foreach) {
    return createForeachGraphForStepWithForeach(currentStep as StepWithForeach, context);
  }

  if ((currentStep as WaitStep).type === 'wait') {
    return visitWaitStep(currentStep as WaitStep, context);
  }

  if ((currentStep as HttpStep).type === 'http') {
    return visitHttpStep(currentStep as HttpStep, context);
  }

  if ((currentStep as ElasticsearchStep).type?.startsWith('elasticsearch.')) {
    return visitElasticsearchStep(currentStep as ElasticsearchStep, context);
  }

  if ((currentStep as KibanaStep).type?.startsWith('kibana.')) {
    return visitKibanaStep(currentStep as KibanaStep, context);
  }

  return visitAtomicStep(currentStep, context);
}

export function visitWaitStep(currentStep: WaitStep, context: GraphBuildContext): graphlib.Graph {
  const stepId = getStepId(currentStep, context);
  const graph = new graphlib.Graph({ directed: true });
  const waitNode: WaitGraphNode = {
    id: getStepId(currentStep, context),
    type: 'wait',
    stepId,
    stepType: currentStep.type,
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(waitNode.id, waitNode);

  return graph;
}

export function visitHttpStep(currentStep: HttpStep, context: GraphBuildContext): graphlib.Graph {
  const stepId = getStepId(currentStep, context);
  const graph = new graphlib.Graph({ directed: true });
  const httpNode: HttpGraphNode = {
    id: getStepId(currentStep, context),
    type: 'http',
    stepId,
    stepType: currentStep.type,
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(httpNode.id, httpNode);

  return graph;
}

export function visitElasticsearchStep(
  currentStep: any,
  context: GraphBuildContext
): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const elasticsearchNode: ElasticsearchGraphNode = {
    id: getStepId(currentStep, context),
    type: currentStep.type, // e.g., 'elasticsearch.search.query'
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(elasticsearchNode.id, elasticsearchNode);

  return graph;
}

export function visitKibanaStep(currentStep: any, context: GraphBuildContext): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const kibanaNode: KibanaGraphNode = {
    id: getStepId(currentStep, context),
    type: currentStep.type, // e.g., 'kibana.cases.create'
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(kibanaNode.id, kibanaNode);

  return graph;
}

export function visitAtomicStep(currentStep: BaseStep, context: GraphBuildContext): graphlib.Graph {
  const stepId = getStepId(currentStep, context);
  const graph = new graphlib.Graph({ directed: true });
  const atomicNode: AtomicGraphNode = {
    id: getStepId(currentStep, context),
    type: 'atomic',
    stepId,
    stepType: currentStep.type,
    configuration: {
      ...currentStep,
    },
  };
  graph.setNode(atomicNode.id, atomicNode);

  return graph;
}

function createIfGraph(stepId: string, ifStep: IfStep, context: GraphBuildContext): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterConditionNodeId = `enterCondition_${stepId}`;
  const exitConditionNodeId = `exitCondition_${stepId}`;
  const ifElseStep = ifStep as IfStep;
  const trueSteps: BaseStep[] = ifElseStep.steps || [];
  const falseSteps: BaseStep[] = ifElseStep.else || [];

  const conditionNode: EnterIfNode = {
    id: enterConditionNodeId,
    exitNodeId: exitConditionNodeId,
    type: 'enter-if',
    stepId,
    stepType: ifStep.type,
    configuration: {
      ...omit(ifElseStep, ['steps', 'else']), // No need to include them as they will be represented in the graph
    },
  };
  context.stack.push(conditionNode);
  const exitConditionNode: ExitIfNode = {
    type: 'exit-if',
    id: exitConditionNodeId,
    stepId,
    stepType: ifStep.type,
    startNodeId: enterConditionNodeId,
  };
  const enterThenBranchNode: EnterConditionBranchNode = {
    id: `enterThen_${stepId}`,
    type: 'enter-then-branch',
    condition: ifElseStep.condition,
    stepId,
    stepType: ifStep.type,
  };

  graph.setNode(enterThenBranchNode.id, enterThenBranchNode);
  graph.setEdge(enterConditionNodeId, enterThenBranchNode.id);

  const exitThenBranchNode: ExitConditionBranchNode = {
    id: `exitThen_${stepId}`,
    type: 'exit-then-branch',
    stepType: ifStep.type,
    startNodeId: enterThenBranchNode.id,
    stepId,
  };
  const thenGraph = createStepsSequence(trueSteps, context);
  insertGraphBetweenNodes(graph, thenGraph, enterThenBranchNode.id, exitThenBranchNode.id);
  graph.setNode(exitThenBranchNode.id, exitThenBranchNode);
  graph.setEdge(exitThenBranchNode.id, exitConditionNode.id);

  if (falseSteps?.length > 0) {
    const enterElseBranchNode: EnterConditionBranchNode = {
      id: `enterElse_${stepId}`,
      type: 'enter-else-branch',
      stepId,
      stepType: ifStep.type,
    };
    graph.setNode(enterElseBranchNode.id, enterElseBranchNode);
    graph.setEdge(enterConditionNodeId, enterElseBranchNode.id);
    const exitElseBranchNode: ExitConditionBranchNode = {
      id: `exitElse_${stepId}`,
      type: 'exit-else-branch',
      startNodeId: enterElseBranchNode.id,
      stepId,
      stepType: ifStep.type,
    };
    const elseGraph = createStepsSequence(falseSteps, context);
    insertGraphBetweenNodes(graph, elseGraph, enterElseBranchNode.id, exitElseBranchNode.id);
    graph.setNode(exitElseBranchNode.id, exitElseBranchNode);
    graph.setEdge(exitElseBranchNode.id, exitConditionNode.id);
  }

  graph.setNode(exitConditionNode.id, exitConditionNode);
  graph.setNode(enterConditionNodeId, conditionNode);

  context.stack.pop();
  return graph;
}

function createIfGraphForIfStepLevel(
  stepWithIfCondition: StepWithIfCondition,
  context: GraphBuildContext
) {
  const stepId = getStepId(stepWithIfCondition as BaseStep, context);
  const generatedStepId = `if_${stepId}`;
  const ifStep: IfStep = {
    name: generatedStepId,
    type: 'if',
    condition: stepWithIfCondition.if,
    steps: [omit(stepWithIfCondition, ['if'])],
  } as IfStep;
  return createIfGraph(generatedStepId, ifStep, context);
}

function visitOnFailure(
  currentStep: BaseStep,
  onFailureConfiguration: WorkflowOnFailure,
  context: GraphBuildContext
): any {
  const stepId = getStepId(currentStep, context);
  const onFailureGraphNode: GraphNode = {
    id: `onFailure_${stepId}`,
    type: 'on-failure',
    stepId,
    stepType: 'on-failure',
  };

  context.stack.push(onFailureGraphNode);
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
    graph = createRetry(stepId, graph, onFailureConfiguration.retry);
  }

  if (onFailureConfiguration.fallback?.length) {
    graph = createFallback(stepId, graph, onFailureConfiguration.fallback, context);
  }

  if (onFailureConfiguration.continue) {
    graph = createContinue(stepId, graph);
  }

  context.stack.pop();

  return graph;
}

function handleStepLevelOnFailure(
  step: BaseStep,
  context: GraphBuildContext
): graphlib.Graph | null {
  const stackEntry: GraphNode = {
    id: `stepLevelOnFailure_${getStepId(step, context)}`,
    type: 'step-level-on-failure',
    stepId: getStepId(step, context),
    stepType: step.type,
  };
  if (context.stack.some((node) => node.id === stackEntry.id)) {
    return null;
  }
  context.stack.push(stackEntry);
  const result = visitOnFailure(step, (step as StepWithOnFailure)['on-failure']!, context);
  context.stack.pop();
  return result;
}

function handleWorkflowLevelOnFailure(
  step: BaseStep,
  context: GraphBuildContext
): graphlib.Graph | null {
  if (flowControlStepTypes.has(step.type) || disallowedWorkflowLevelOnFailureSteps.has(step.type)) {
    return null;
  }

  const stackEntry: GraphNode = {
    id: `workflowLevelOnFailure_${getStepId(step, { ...context, parentKey: '' })}`,
    type: 'workflow-level-on-failure',
    stepId: getStepId(step, { ...context, parentKey: '' }),
    stepType: step.name,
  };

  if (
    context.stack.some((node) => node.id === stackEntry.id) || // Avoid recursion
    context.stack.some((node) => node.id === `stepLevelOnFailure_${getStepId(step, context)}`) || // Avoid workflow-level on-failure if already in step-level on-failure
    context.stack.some((node) => node.type === 'enter-fallback-path') // Avoid workflow-level on-failure for steps inside fallback path
  ) {
    return null;
  }

  context.stack.push(stackEntry);
  const result = visitOnFailure(step, context.settings!['on-failure']!, context);
  context.stack.pop();
  return result;
}

function createContinue(stepId: string, innerGraph: graphlib.Graph): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterContinueNodeId = `enterContinue_${stepId}`;
  const exitNodeId = `exitContinue_${stepId}`;
  const enterContinueNode: EnterContinueNode = {
    id: enterContinueNodeId,
    type: 'enter-continue',
    stepId,
    stepType: 'continue',
    exitNodeId,
  };
  const exitContinueNode: ExitContinueNode = {
    type: 'exit-continue',
    stepId,
    stepType: 'continue',
    id: exitNodeId,
  };
  graph.setNode(enterContinueNode.id, enterContinueNode);
  graph.setNode(exitContinueNode.id, exitContinueNode);
  insertGraphBetweenNodes(graph, innerGraph, enterContinueNode.id, exitContinueNode.id);
  return graph;
}

function createRetry(
  stepId: string,
  innerGraph: graphlib.Graph,
  retry: WorkflowRetry
): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterRetryNodeId = `enterRetry_${stepId}`;
  const exitNodeId = `exitRetry_${stepId}`;
  const enterRetryNode: EnterRetryNode = {
    id: enterRetryNodeId,
    type: 'enter-retry',
    stepId,
    stepType: 'retry',
    exitNodeId,
    configuration: retry,
  };
  const exitRetryNode: ExitRetryNode = {
    type: 'exit-retry',
    id: exitNodeId,
    stepId,
    stepType: 'retry',
    startNodeId: enterRetryNodeId,
  };
  graph.setNode(enterRetryNode.id, enterRetryNode);
  graph.setNode(exitRetryNode.id, exitRetryNode);
  insertGraphBetweenNodes(graph, innerGraph, enterRetryNode.id, exitRetryNode.id);
  return graph;
}

function createNormalPath(stepId: string, normalPathGraph: graphlib.Graph): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterNormalPathNodeId = `enterNormalPath_${stepId}`;
  const exitNormalPathNodeId = `exitNormalPath_${stepId}`;
  const enterNormalPathNode: EnterNormalPathNode = {
    id: enterNormalPathNodeId,
    type: 'enter-normal-path',
    stepId,
    stepType: 'fallback',
    enterZoneNodeId: `enterTryBlock_${stepId}`,
    enterFailurePathNodeId: `enterFallbackPath_${stepId}`,
  };
  const exitNormalPathNode: ExitNormalPathNode = {
    id: exitNormalPathNodeId,
    stepId,
    stepType: 'fallback',
    type: 'exit-normal-path',
    enterNodeId: enterNormalPathNodeId,
    exitOnFailureZoneNodeId: `exitTryBlock_${stepId}`,
  };
  graph.setNode(enterNormalPathNode.id, enterNormalPathNode);
  graph.setNode(exitNormalPathNode.id, exitNormalPathNode);

  insertGraphBetweenNodes(graph, normalPathGraph, enterNormalPathNode.id, exitNormalPathNode.id);
  return graph;
}

function createFallbackPath(
  stepId: string,
  fallbackSteps: BaseStep[],
  context: GraphBuildContext
): graphlib.Graph {
  const workflowLevelOnFailure = context.stack.find(
    (node) => node.type === 'workflow-level-on-failure'
  );
  const graph = new graphlib.Graph({ directed: true });
  const enterFallbackPathNodeId = `enterFallbackPath_${stepId}`;
  const exitFallbackPathNodeId = `exitFallbackPath_${stepId}`;
  const enterFallbackPathNode: EnterFallbackPathNode = {
    id: enterFallbackPathNodeId,
    stepId,
    stepType: 'fallback',
    type: 'enter-fallback-path',
    enterZoneNodeId: enterFallbackPathNodeId,
  };
  context.stack.push(enterFallbackPathNode);
  const exitFallbackPathNode: ExitFallbackPathNode = {
    id: exitFallbackPathNodeId,
    stepId,
    stepType: 'fallback',
    type: 'exit-fallback-path',
    enterNodeId: enterFallbackPathNodeId,
    exitOnFailureZoneNodeId: `exitTryBlock_${stepId}`,
  };
  graph.setNode(enterFallbackPathNode.id, enterFallbackPathNode);
  graph.setNode(exitFallbackPathNode.id, exitFallbackPathNode);
  const fallbackPathGraph = createStepsSequence(fallbackSteps, {
    ...context,
    parentKey: workflowLevelOnFailure ? [workflowLevelOnFailure.type, stepId].join('_') : '',
  });
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
  stepId: string,
  normalPathGraph: graphlib.Graph,
  fallbackPathSteps: BaseStep[],
  context: GraphBuildContext
): graphlib.Graph {
  const graph = new graphlib.Graph({ directed: true });
  const enterTryBlockNodeId = `enterTryBlock_${stepId}`;
  const exitTryBlockNodeId = `exitTryBlock_${stepId}`;
  const enterNormalPathNodeId = `enterNormalPath_${stepId}`;

  const enterTryBlockNode: EnterTryBlockNode = {
    id: enterTryBlockNodeId,
    exitNodeId: exitTryBlockNodeId,
    stepId,
    stepType: 'fallback',
    type: 'enter-try-block',
    enterNormalPathNodeId,
  };
  graph.setNode(enterTryBlockNodeId, enterTryBlockNode);
  const exitTryBlockNode: ExitTryBlockNode = {
    id: exitTryBlockNodeId,
    type: 'exit-try-block',
    stepId,
    stepType: 'fallback',
    enterNodeId: enterTryBlockNodeId,
  };
  graph.setNode(exitTryBlockNodeId, exitTryBlockNode);

  const normalPathGraphWithNodes = createNormalPath(stepId, normalPathGraph);
  insertGraphBetweenNodes(graph, normalPathGraphWithNodes, enterTryBlockNodeId, exitTryBlockNodeId);

  const fallbackPathGraph = createFallbackPath(stepId, fallbackPathSteps, context);
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

function createForeachGraph(
  stepId: string,
  foreachStep: ForEachStep,
  context: GraphBuildContext
): any {
  const graph = new graphlib.Graph({ directed: true });
  const enterForeachNodeId = `enterForeach_${stepId}`;
  const exitNodeId = `exitForeach_${stepId}`;
  const enterForeachNode: EnterForeachNode = {
    id: enterForeachNodeId,
    type: 'enter-foreach',
    stepId,
    stepType: foreachStep.type,
    exitNodeId,
    configuration: {
      ...omit(foreachStep, ['steps']), // No need to include them as they will be represented in the graph
    },
  };
  context.stack.push(enterForeachNode);
  graph.setNode(enterForeachNodeId, enterForeachNode);
  const exitForeachNode: ExitForeachNode = {
    type: 'exit-foreach',
    id: exitNodeId,
    stepType: foreachStep.type,
    stepId,
    startNodeId: enterForeachNodeId,
  };
  graph.setNode(exitNodeId, exitForeachNode);
  const innerGraph = createStepsSequence(foreachStep.steps || [], context);

  insertGraphBetweenNodes(graph, innerGraph, enterForeachNodeId, exitNodeId);
  context.stack.pop();
  return graph;
}

function createForeachGraphForStepWithForeach(
  stepWithForeach: StepWithForeach,
  context: GraphBuildContext
) {
  const stepId = getStepId(stepWithForeach as BaseStep, context);
  const generatedStepId = `foreach_${stepId}`;
  const foreachStep: ForEachStep = {
    name: generatedStepId,
    type: 'foreach',
    foreach: stepWithForeach.foreach,
    steps: [omit(stepWithForeach, ['foreach'])],
  } as ForEachStep;
  return createForeachGraph(generatedStepId, foreachStep, context);
}

export function convertToWorkflowGraph(workflowSchema: WorkflowYaml): graphlib.Graph {
  const context: GraphBuildContext = {
    settings: workflowSchema.settings,
    stack: [],
    parentKey: '',
  };

  return createStepsSequence(workflowSchema.steps, context);
}

export function convertToSerializableGraph(graph: graphlib.Graph): any {
  return graphlib.json.write(graph); // GraphLib does not provide type information, so we use `any`
}
