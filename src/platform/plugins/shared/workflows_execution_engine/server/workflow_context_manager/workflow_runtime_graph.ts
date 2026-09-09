/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import { createSHA256Hash } from '@kbn/crypto';
import type { StackFrame } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowScopeStack } from './workflow_scope_stack';

type ScopeEntry = StackFrame['nestedScopes'][number];

/** Prefix on ids of runtime-created enter nodes (e.g. a loop iteration). */
export const ENTER_SYNTHETIC_PREFIX = 'enterSynthetic_';
/** Prefix on ids of runtime-created exit nodes (e.g. a loop iteration). */
export const EXIT_SYNTHETIC_PREFIX = 'exitSynthetic_';
const SCOPE_HASH_LENGTH = 16;

/**
 * Graph lookups a step needs: current node, neighbors, nested steps, timeout.
 * Use this type on step deps. The engine owns {@link WorkflowRuntimeGraph} itself.
 */
export type RuntimeGraphView = Pick<
  WorkflowRuntimeGraph,
  | 'getNode'
  | 'getDirectSuccessors'
  | 'getInnerStepIds'
  | 'getAllPredecessors'
  | 'getWorkflowLevelTimeout'
  | 'topologicalOrder'
>;

/**
 * The graph the execution cursor walks.
 *
 * Same nodes as the compiled workflow, plus scopes that only exist once the run
 * knows them — a foreach iteration, a while iteration. Look them up and land on
 * them the same way as compiled nodes. Pass `stackFrames` from a resumed
 * execution so those scopes are present again.
 */
export class WorkflowRuntimeGraph {
  private readonly compiledGraph: WorkflowGraph;
  private internalGraph: graphlib.Graph;

  constructor(compiledGraph: WorkflowGraph, stackFrames: StackFrame[]) {
    this.compiledGraph = compiledGraph;
    this.internalGraph = new graphlib.Graph({ directed: true });
    this.init(compiledGraph, stackFrames);
  }

  /** Walk order for the current graph. The execution loop uses this to advance. */
  public get topologicalOrder(): string[] {
    return graphlib.alg.topsort(this.internalGraph);
  }

  /**
   * Adds a runtime scope under `ownerNodeId` (one loop iteration) and returns the
   * enter node the cursor should move to.
   */
  public insertSyntheticScope(ownerNodeId: string, stepId: string, stepType?: string): string {
    const ownerExitNodeId = ownerNodeId.replace(/^enter/, 'exit');
    const ownerExitInEdges = this.internalGraph.inEdges(ownerExitNodeId) ?? [];
    const lastBeforeOwnerExit = ownerExitInEdges[0];

    if (!this.internalGraph.hasNode(ownerNodeId) || !lastBeforeOwnerExit) {
      throw new Error(`Owner enter node ${ownerNodeId} has no outgoing edge to a child`);
    }

    const scopeHash = this.syntheticScopeHash(ownerNodeId, stepId);
    const enterSyntheticId = `${ENTER_SYNTHETIC_PREFIX}${stepId}_${scopeHash}`;
    const exitSyntheticId = `${EXIT_SYNTHETIC_PREFIX}${stepId}_${scopeHash}`;

    if (this.internalGraph.hasNode(enterSyntheticId)) {
      throw new Error(`Synthetic scope ${stepId} is already in the graph`);
    }

    const { enterType, exitType } = syntheticPairTypes(stepType, stepId);

    const enterSyntheticNode = {
      id: enterSyntheticId,
      type: enterType,
      stepId,
      stepType: stepId,
    } as GraphNodeUnion;

    const exitSyntheticNode = {
      id: exitSyntheticId,
      type: exitType,
      stepId,
      stepType: stepId,
    } as GraphNodeUnion;

    this.internalGraph.setNode(enterSyntheticNode.id, enterSyntheticNode);
    this.internalGraph.setNode(exitSyntheticNode.id, exitSyntheticNode);

    if (lastBeforeOwnerExit.v.startsWith(EXIT_SYNTHETIC_PREFIX)) {
      this.appendSyntheticScope(
        ownerNodeId,
        lastBeforeOwnerExit.v,
        ownerExitNodeId,
        enterSyntheticNode,
        exitSyntheticNode,
        stepId
      );
      return enterSyntheticId;
    }

    this.wrapOwnerWithSyntheticScope(
      ownerNodeId,
      ownerExitNodeId,
      enterSyntheticNode,
      exitSyntheticNode
    );

    return enterSyntheticId;
  }

  /** Node the cursor or a step should run, by id. */
  public getNode(nodeId: string): GraphNodeUnion {
    return this.internalGraph.node(nodeId) as GraphNodeUnion;
  }

  /** Nodes that run immediately after `nodeId`. */
  public getDirectSuccessors(nodeId: string): GraphNodeUnion[] {
    const successors = this.internalGraph.successors(nodeId) ?? [];
    return successors.map((id) => this.internalGraph.node(id) as GraphNodeUnion);
  }

  /** Nodes that must have run before `nodeId`. */
  public getAllPredecessors(nodeId: string): GraphNodeUnion[] {
    const visited = new Set<string>();
    const collectPredecessors = (predNodeId: string) => {
      if (visited.has(predNodeId)) {
        return;
      }

      visited.add(predNodeId);

      const preds = this.internalGraph.predecessors(predNodeId) ?? [];
      preds.forEach((predId) => collectPredecessors(predId));
    };

    const directPredecessors = this.internalGraph.predecessors(nodeId) ?? [];
    directPredecessors.forEach((predId) => collectPredecessors(predId));
    return Array.from(visited).map((id) => this.internalGraph.node(id) as GraphNodeUnion);
  }

  /** Step ids nested inside a compound step (foreach body, if branch, and so on). */
  public getInnerStepIds(compoundStepId: string): Set<string> {
    return this.compiledGraph.getInnerStepIds(compoundStepId);
  }

  /** Workflow-level timeout step, if the workflow defines one. */
  public getWorkflowLevelTimeout(): string | undefined {
    return this.compiledGraph.getWorkflowLevelTimeout();
  }

  /**
   * Scopes that are open when execution is on `nodeId`.
   * Resume and persist use this as the cursor's stack.
   */
  public getNodeStack(nodeId: string): StackFrame[] {
    const currentNode = this.getNode(nodeId);

    if (!currentNode) {
      throw new Error(`Node not found for node id: ${nodeId}`);
    }

    const openEnterNodeIds: string[] = [];

    for (const node of this.getAllPredecessors(nodeId).toReversed()) {
      if (node.type.startsWith('enter-')) {
        openEnterNodeIds.push(node.id);
      }

      if (node.type.startsWith('exit-')) {
        openEnterNodeIds.pop();
      }
    }

    if (currentNode.type.startsWith('exit-')) {
      openEnterNodeIds.pop();
    }

    let scopeStack = new WorkflowScopeStack();

    for (const enterNodeId of openEnterNodeIds) {
      const node = this.getNode(enterNodeId);

      if (!node) {
        throw new Error(`Node not found for node id: ${enterNodeId}`);
      }

      scopeStack = scopeStack.enterScope({
        nodeId: node.id,
        nodeType: node.type,
        stepId: node.stepId,
      });
    }

    return scopeStack.stackFrames;
  }

  private init(compiledGraph: WorkflowGraph, stackFrames: StackFrame[]): void {
    for (const node of compiledGraph.getAllNodes()) {
      this.internalGraph.setNode(node.id, node);
    }
    for (const edge of compiledGraph.getEdges()) {
      this.internalGraph.setEdge(edge.v, edge.w);
    }

    let ownerEnterNodeId: string | undefined;
    for (const frame of stackFrames) {
      for (const scope of frame.nestedScopes) {
        if (!this.internalGraph.hasNode(scope.nodeId)) {
          if (!ownerEnterNodeId) {
            throw new Error(`Synthetic scope ${scope.nodeId} has no compiled owner on the stack`);
          }
          const stepId = this.syntheticStepId(scope, frame);
          this.insertSyntheticScope(ownerEnterNodeId, stepId, scope.nodeType);
        } else if (!this.isExitScope(scope)) {
          ownerEnterNodeId = scope.nodeId;
        }
      }
    }
  }

  private syntheticStepId(scope: ScopeEntry, frame: StackFrame): string {
    const prefixedId = scope.nodeId.startsWith(ENTER_SYNTHETIC_PREFIX)
      ? scope.nodeId.slice(ENTER_SYNTHETIC_PREFIX.length)
      : scope.nodeId.startsWith(EXIT_SYNTHETIC_PREFIX)
      ? scope.nodeId.slice(EXIT_SYNTHETIC_PREFIX.length)
      : undefined;

    if (prefixedId) {
      const hashSeparator = prefixedId.lastIndexOf('_');
      if (hashSeparator > 0 && prefixedId.length - hashSeparator - 1 === SCOPE_HASH_LENGTH) {
        return prefixedId.slice(0, hashSeparator);
      }
      return prefixedId;
    }

    return scope.scopeId ?? frame.stepId;
  }

  private isExitScope(scope: ScopeEntry): boolean {
    return scope.nodeType.startsWith('exit-') || scope.nodeId.startsWith(EXIT_SYNTHETIC_PREFIX);
  }

  private wrapOwnerWithSyntheticScope(
    ownerNodeId: string,
    ownerExitNodeId: string,
    enterSyntheticNode: GraphNodeUnion,
    exitSyntheticNode: GraphNodeUnion
  ): void {
    const ownerEnterOutEdges = this.internalGraph.outEdges(ownerNodeId) ?? [];
    const ownerEnterEdge = ownerEnterOutEdges[0];

    if (!ownerEnterEdge) {
      throw new Error(`Owner enter node ${ownerNodeId} has no outgoing edge to a child`);
    }

    this.internalGraph.removeEdge(ownerEnterEdge.v, ownerEnterEdge.w);
    this.internalGraph.setEdge(ownerNodeId, enterSyntheticNode.id);
    this.internalGraph.setEdge(enterSyntheticNode.id, ownerEnterEdge.w);

    const ownerExitInEdges = this.internalGraph.inEdges(ownerExitNodeId) ?? [];
    const ownerExitEdge = ownerExitInEdges[0];

    if (!ownerExitEdge) {
      throw new Error(`Owner exit node ${ownerExitNodeId} has no incoming edge from a child`);
    }

    this.internalGraph.removeEdge(ownerExitEdge.v, ownerExitEdge.w);
    this.internalGraph.setEdge(ownerExitEdge.v, exitSyntheticNode.id);
    this.internalGraph.setEdge(exitSyntheticNode.id, ownerExitNodeId);
  }

  private appendSyntheticScope(
    ownerNodeId: string,
    previousExitId: string,
    ownerExitNodeId: string,
    enterSyntheticNode: GraphNodeUnion,
    exitSyntheticNode: GraphNodeUnion,
    stepId: string
  ): void {
    const ownerOutEdges = this.internalGraph.outEdges(ownerNodeId) ?? [];
    const firstEnterId = ownerOutEdges[0]?.w;

    if (!firstEnterId || !firstEnterId.startsWith(ENTER_SYNTHETIC_PREFIX)) {
      throw new Error(`Owner enter node ${ownerNodeId} has no synthetic scope to append after`);
    }

    const firstExitId = firstEnterId.replace(/^enter/, 'exit');
    const clonedByOriginalId = this.cloneInterior(
      firstEnterId,
      firstExitId,
      this.syntheticScopeHash(ownerNodeId, stepId)
    );

    this.internalGraph.removeEdge(previousExitId, ownerExitNodeId);
    this.internalGraph.setEdge(previousExitId, enterSyntheticNode.id);

    const firstEnterOutEdges = this.internalGraph.outEdges(firstEnterId) ?? [];

    if (firstEnterOutEdges.length === 0) {
      throw new Error(`Synthetic enter node ${firstEnterId} has no outgoing edge to a child`);
    }

    for (const edge of firstEnterOutEdges) {
      if (edge.w === firstExitId) {
        this.internalGraph.setEdge(enterSyntheticNode.id, exitSyntheticNode.id);
      } else {
        const clonedStartId = clonedByOriginalId.get(edge.w);
        if (!clonedStartId) {
          throw new Error(`Failed to clone child graph node ${edge.w}`);
        }
        this.internalGraph.setEdge(enterSyntheticNode.id, clonedStartId);
      }
    }

    for (const [originalId, clonedId] of clonedByOriginalId) {
      const originalOutEdges = this.internalGraph.outEdges(originalId) ?? [];
      for (const edge of originalOutEdges) {
        if (edge.w === firstExitId) {
          this.internalGraph.setEdge(clonedId, exitSyntheticNode.id);
        } else {
          const clonedSuccessorId = clonedByOriginalId.get(edge.w);
          if (clonedSuccessorId) {
            this.internalGraph.setEdge(clonedId, clonedSuccessorId);
          }
        }
      }
    }

    this.internalGraph.setEdge(exitSyntheticNode.id, ownerExitNodeId);
  }

  private syntheticScopeHash(ownerNodeId: string, stepId: string): string {
    const ownerNode = this.getNode(ownerNodeId);

    if (!ownerNode) {
      throw new Error(`Node not found for node id: ${ownerNodeId}`);
    }

    const frames = new WorkflowScopeStack()
      .enterScope({
        nodeId: ownerNode.id,
        nodeType: ownerNode.type,
        stepId: ownerNode.stepId,
      })
      .enterScope({
        nodeId: `${ENTER_SYNTHETIC_PREFIX}${stepId}`,
        nodeType: `enter-${stepId}`,
        stepId,
      }).stackFrames;

    return createSHA256Hash(JSON.stringify(frames)).slice(0, SCOPE_HASH_LENGTH);
  }

  private cloneInterior(enterId: string, exitId: string, scopeHash: string): Map<string, string> {
    const clonedByOriginalId = new Map<string, string>();

    for (const originalId of this.nodesBetween(enterId, exitId)) {
      const originalNode = this.getNode(originalId);

      if (!originalNode) {
        throw new Error(`Node not found for node id: ${originalId}`);
      }

      const clonedId = `${originalId}_${scopeHash}`;

      if (this.internalGraph.hasNode(clonedId)) {
        throw new Error(`Cloned node id ${clonedId} already exists in the graph`);
      }

      clonedByOriginalId.set(originalId, clonedId);
      this.internalGraph.setNode(clonedId, { ...originalNode, id: clonedId });
    }

    return clonedByOriginalId;
  }

  private nodesBetween(enterId: string, exitId: string): string[] {
    const visited = new Set<string>();
    const interior: string[] = [];

    const visit = (nodeId: string) => {
      if (nodeId === exitId || visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);

      if (nodeId !== enterId) {
        interior.push(nodeId);
      }

      const successors = this.internalGraph.successors(nodeId) ?? [];
      successors.forEach((successorId) => visit(successorId));
    };

    visit(enterId);
    return interior;
  }
}

function syntheticPairTypes(
  nodeType: string | undefined,
  stepId: string
): { enterType: string; exitType: string } {
  const raw = nodeType ?? stepId;

  if (raw === 'iteration' || raw === 'enter-iteration' || raw === 'exit-iteration') {
    return { enterType: 'enter-iteration', exitType: 'exit-iteration' };
  }

  if (raw.startsWith('enter-')) {
    return { enterType: raw, exitType: raw.replace(/^enter-/, 'exit-') };
  }

  if (raw.startsWith('exit-')) {
    return { enterType: raw.replace(/^exit-/, 'enter-'), exitType: raw };
  }

  return { enterType: `enter-${raw}`, exitType: `exit-${raw}` };
}
