/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { GraphNodeUnion } from '../types';
import type { WorkflowGraph } from '../workflow_graph/workflow_graph';

/**
 * Represents a detected loop/cycle in the workflow graph
 */
export interface DetectedLoop {
  /** Unique identifier for this loop detection */
  id: string;
  /** The type of loop detected */
  type: LoopType;
  /** The node IDs that form the cycle, in order */
  cyclePath: string[];
  /** Human-readable description of the loop */
  description: string;
  /** The step IDs involved in the loop */
  stepIds: string[];
  /** Whether this loop is intentional (foreach, retry) or unintentional */
  isIntentional: boolean;
}

/**
 * The type of loop detected in the workflow
 */
export type LoopType =
  | 'foreach' // Intentional: foreach iteration loop
  | 'retry' // Intentional: retry loop for error handling
  | 'self-reference' // Unintentional: a step references itself
  | 'circular-dependency' // Unintentional: steps form a cycle
  | 'unknown'; // Could not classify the loop type

/**
 * Result of the loop detection analysis
 */
export interface LoopDetectionResult {
  /** Whether the graph is acyclic (no unintentional loops) */
  isAcyclic: boolean;
  /** Whether the graph has any cycles at all (including intentional) */
  hasCycles: boolean;
  /** All detected loops */
  loops: DetectedLoop[];
  /** Only unintentional loops (problems that need to be fixed) */
  unintentionalLoops: DetectedLoop[];
  /** Only intentional loops (foreach, retry - normal workflow constructs) */
  intentionalLoops: DetectedLoop[];
}

/**
 * Analyzes a workflow graph for loop detection.
 *
 * This analyzer distinguishes between:
 * - **Intentional loops**: foreach iterations, retry mechanisms - normal workflow constructs
 * - **Unintentional loops**: circular dependencies, self-references - errors in workflow definition
 *
 * Note: The workflow graph builder creates DAGs by design. Intentional loop constructs
 * (foreach, retry) are represented with enter/exit node pairs, not actual back-edges.
 * This analyzer detects both structural loop patterns and actual graph cycles.
 *
 * @example
 * ```typescript
 * const graph = WorkflowGraph.fromWorkflowDefinition(workflowDef);
 * const result = analyzeLoops(graph);
 *
 * if (!result.isAcyclic) {
 *   console.error('Found unintentional cycles:', result.unintentionalLoops);
 * }
 * ```
 */
export function analyzeLoops(workflowGraph: WorkflowGraph): LoopDetectionResult {
  const nodes = workflowGraph.getAllNodes();
  const edges = workflowGraph.getEdges();

  // Build a graphlib graph for cycle detection algorithms
  const graph = new graphlib.Graph({ directed: true });
  nodes.forEach((node) => graph.setNode(node.id, node));
  edges.forEach((edge) => graph.setEdge(edge.v, edge.w));

  const loops: DetectedLoop[] = [];

  // 1. Detect intentional loop structures (enter/exit pairs)
  const intentionalLoops = detectIntentionalLoops(workflowGraph, nodes);
  loops.push(...intentionalLoops);

  // 2. Detect actual graph cycles using cycle detection algorithm
  const graphCycles = findGraphCycles(graph, workflowGraph);
  loops.push(...graphCycles);

  // 3. Detect self-references (a node pointing to itself)
  const selfReferences = detectSelfReferences(edges, workflowGraph);
  loops.push(...selfReferences);

  // Deduplicate loops by id
  const uniqueLoops = deduplicateLoops(loops);

  const unintentionalLoops = uniqueLoops.filter((loop) => !loop.isIntentional);
  const intentionalLoopsOnly = uniqueLoops.filter((loop) => loop.isIntentional);

  return {
    isAcyclic: unintentionalLoops.length === 0,
    hasCycles: uniqueLoops.length > 0,
    loops: uniqueLoops,
    unintentionalLoops,
    intentionalLoops: intentionalLoopsOnly,
  };
}

/**
 * Detects intentional loop structures based on enter/exit node pairs.
 * These are normal workflow constructs like foreach and retry.
 */
function detectIntentionalLoops(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[]
): DetectedLoop[] {
  const loops: DetectedLoop[] = [];

  for (const node of nodes) {
    // Detect foreach loops
    if (node.type === 'enter-foreach') {
      const exitNodeId = (node as { exitNodeId?: string }).exitNodeId;
      if (exitNodeId) {
        loops.push({
          id: `foreach-${node.stepId}`,
          type: 'foreach',
          cyclePath: [node.id, exitNodeId],
          description: `Foreach loop for step "${node.stepId}" iterates over a collection`,
          stepIds: [node.stepId],
          isIntentional: true,
        });
      }
    }

    // Detect retry loops
    if (node.type === 'enter-retry') {
      const exitNodeId = (node as { exitNodeId?: string }).exitNodeId;
      if (exitNodeId) {
        loops.push({
          id: `retry-${node.stepId}`,
          type: 'retry',
          cyclePath: [node.id, exitNodeId],
          description: `Retry loop for step "${node.stepId}" may re-execute on failure`,
          stepIds: [node.stepId],
          isIntentional: true,
        });
      }
    }
  }

  return loops;
}

/**
 * Finds actual cycles in the graph using DFS-based cycle detection.
 * These are typically unintentional and indicate problems in workflow definition.
 */
function findGraphCycles(graph: graphlib.Graph, workflowGraph: WorkflowGraph): DetectedLoop[] {
  const loops: DetectedLoop[] = [];

  // Use graphlib's findCycles which returns arrays of node ids forming cycles
  const cycles = graphlib.alg.findCycles(graph);

  for (let i = 0; i < cycles.length; i++) {
    const cycle = cycles[i];
    if (cycle.length === 0) {
      // Skip empty cycles
      // eslint-disable-next-line no-continue
      continue;
    }

    // Get the step IDs for all nodes in the cycle
    const stepIds = new Set<string>();
    const nodeTypes = new Set<string>();

    for (const nodeId of cycle) {
      const node = workflowGraph.getNode(nodeId);
      if (node) {
        stepIds.add(node.stepId);
        nodeTypes.add(node.type);
      }
    }

    // Classify the cycle
    const loopType = classifyCycle(cycle, nodeTypes);
    const isIntentional = loopType === 'foreach' || loopType === 'retry';

    loops.push({
      id: `cycle-${i}-${cycle.join('-')}`,
      type: loopType,
      cyclePath: cycle,
      description: generateCycleDescription(cycle, loopType, workflowGraph),
      stepIds: Array.from(stepIds),
      isIntentional,
    });
  }

  return loops;
}

/**
 * Detects self-references where a node has an edge to itself.
 */
function detectSelfReferences(
  edges: Array<{ v: string; w: string }>,
  workflowGraph: WorkflowGraph
): DetectedLoop[] {
  const loops: DetectedLoop[] = [];

  for (const edge of edges) {
    if (edge.v === edge.w) {
      const node = workflowGraph.getNode(edge.v);
      const stepId = node?.stepId || edge.v;

      loops.push({
        id: `self-ref-${edge.v}`,
        type: 'self-reference',
        cyclePath: [edge.v],
        description: `Step "${stepId}" references itself, creating an infinite loop`,
        stepIds: [stepId],
        isIntentional: false,
      });
    }
  }

  return loops;
}

/**
 * Classifies a cycle based on the node types involved.
 */
function classifyCycle(cycle: string[], nodeTypes: Set<string>): LoopType {
  // If the cycle contains only foreach-related nodes, it's a foreach loop
  const foreachTypes = ['enter-foreach', 'exit-foreach'];
  const allForeach = Array.from(nodeTypes).every(
    (type) =>
      foreachTypes.includes(type) || (!type.startsWith('enter-') && !type.startsWith('exit-'))
  );
  if (nodeTypes.has('enter-foreach') && allForeach) {
    return 'foreach';
  }

  // If the cycle contains retry-related nodes, it's a retry loop
  const retryTypes = ['enter-retry', 'exit-retry'];
  const hasRetryNodes = Array.from(nodeTypes).some((type) => retryTypes.includes(type));
  if (hasRetryNodes) {
    return 'retry';
  }

  // If it's a single-node cycle, it's a self-reference
  if (cycle.length === 1) {
    return 'self-reference';
  }

  // Otherwise, it's a circular dependency
  return 'circular-dependency';
}

/**
 * Generates a human-readable description for a detected cycle.
 */
function generateCycleDescription(
  cycle: string[],
  loopType: LoopType,
  workflowGraph: WorkflowGraph
): string {
  const stepNames = cycle.map((nodeId) => {
    const node = workflowGraph.getNode(nodeId);
    return node?.stepId || nodeId;
  });

  switch (loopType) {
    case 'foreach':
      return `Foreach loop iterating through: ${stepNames.join(' -> ')}`;
    case 'retry':
      return `Retry loop for error handling: ${stepNames.join(' -> ')}`;
    case 'self-reference':
      return `Step "${stepNames[0]}" references itself`;
    case 'circular-dependency':
      return `Circular dependency detected: ${stepNames.join(' -> ')} -> ${stepNames[0]}`;
    default:
      return `Unknown loop type: ${stepNames.join(' -> ')}`;
  }
}

/**
 * Deduplicates loops based on their ID.
 */
function deduplicateLoops(loops: DetectedLoop[]): DetectedLoop[] {
  const seen = new Set<string>();
  return loops.filter((loop) => {
    if (seen.has(loop.id)) {
      return false;
    }
    seen.add(loop.id);
    return true;
  });
}

/**
 * Validates that a workflow graph is acyclic (contains no unintentional loops).
 * Throws an error if unintentional cycles are detected.
 *
 * @throws Error if unintentional cycles are detected
 */
export function validateNoUnintentionalLoops(workflowGraph: WorkflowGraph): void {
  const result = analyzeLoops(workflowGraph);

  if (!result.isAcyclic) {
    const cycleDescriptions = result.unintentionalLoops
      .map((loop) => `  - ${loop.description}`)
      .join('\n');

    throw new Error(
      `Workflow contains unintentional cycles that would cause infinite execution:\n${cycleDescriptions}`
    );
  }
}

/**
 * Gets a summary of loop analysis for debugging or reporting purposes.
 */
export function getLoopAnalysisSummary(result: LoopDetectionResult): string {
  const lines: string[] = [];

  lines.push(`Loop Analysis Summary:`);
  lines.push(`  Acyclic (no problems): ${result.isAcyclic}`);
  lines.push(`  Total loops detected: ${result.loops.length}`);
  lines.push(`  Intentional loops: ${result.intentionalLoops.length}`);
  lines.push(`  Unintentional loops: ${result.unintentionalLoops.length}`);

  if (result.intentionalLoops.length > 0) {
    lines.push(`\nIntentional loops (normal workflow constructs):`);
    for (const loop of result.intentionalLoops) {
      lines.push(`  [${loop.type}] ${loop.description}`);
    }
  }

  if (result.unintentionalLoops.length > 0) {
    lines.push(`\nUnintentional loops (problems to fix):`);
    for (const loop of result.unintentionalLoops) {
      lines.push(`  [${loop.type}] ${loop.description}`);
      lines.push(`    Path: ${loop.cyclePath.join(' -> ')}`);
    }
  }

  return lines.join('\n');
}
