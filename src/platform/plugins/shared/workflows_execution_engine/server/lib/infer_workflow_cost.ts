/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { type GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { StepCost } from '@kbn/workflows-extensions/common';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

/**
 * Workflow cost tier that maps to Task Manager's TaskCost.
 * This is used to determine which task type variant to use for workflow execution.
 */
export type WorkflowCostTier = 'light' | 'normal' | 'heavy';

/**
 * Maps StepCost enum to WorkflowCostTier string.
 */
function stepCostToTier(cost: StepCost): WorkflowCostTier {
  switch (cost) {
    case StepCost.Light:
      return 'light';
    case StepCost.Heavy:
      return 'heavy';
    case StepCost.Normal:
    default:
      return 'normal';
  }
}

/**
 * Returns the higher of two cost tiers.
 * Order: light < normal < heavy
 */
function getHigherCost(a: WorkflowCostTier, b: WorkflowCostTier): WorkflowCostTier {
  const order: WorkflowCostTier[] = ['light', 'normal', 'heavy'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/**
 * Control flow node types that don't contribute to cost.
 * These are structural nodes that don't perform actual work.
 */
const CONTROL_FLOW_TYPES = new Set([
  'enter-foreach',
  'exit-foreach',
  'enter-if',
  'exit-if',
  'enter-then-branch',
  'exit-then-branch',
  'enter-else-branch',
  'exit-else-branch',
  'enter-retry',
  'exit-retry',
  'enter-continue',
  'exit-continue',
  'enter-try-block',
  'exit-try-block',
  'enter-normal-path',
  'exit-normal-path',
  'enter-fallback-path',
  'exit-fallback-path',
  'enter-timeout-zone',
  'exit-timeout-zone',
  'on-failure',
  'step-level-on-failure',
  'workflow-level-on-failure',
]);

/**
 * Known AI service URL patterns for HTTP step cost inference.
 */
const AI_URL_PATTERNS = {
  domains: [
    /api\.openai\.com/i,
    /api\.anthropic\.com/i,
    /\.openai\.azure\.com/i,
    /generativelanguage\.googleapis\.com/i,
    /api\.cohere\.ai/i,
    /api-inference\.huggingface\.co/i,
    /bedrock-runtime\..*\.amazonaws\.com/i,
    /api\.mistral\.ai/i,
    /api\.together\.xyz/i,
    /api\.groq\.com/i,
    /api\.replicate\.com/i,
  ],
  paths: [/\/v1\/chat\/completions/i, /\/v1\/completions/i, /\/v1\/embeddings/i, /\/messages/i],
};

/**
 * AI-related connector types.
 */
const AI_CONNECTOR_TYPES = new Set(['.gen-ai', '.bedrock', '.gemini', '.inference']);

/**
 * Infers the cost tier for a single graph node.
 * Priority:
 * 1. Check step registry for declared cost
 * 2. Fall back to heuristics for built-in/unknown steps
 */
function inferNodeCost(
  node: GraphNodeUnion,
  stepRegistry?: WorkflowsExtensionsServerPluginStart
): WorkflowCostTier {
  const stepType = node.stepType;

  // Control flow nodes don't contribute to cost
  if (CONTROL_FLOW_TYPES.has(node.type)) {
    return 'light';
  }

  // 1. Check if step has declared cost in registry
  if (stepType && stepRegistry?.hasStepDefinition(stepType)) {
    const stepDef = stepRegistry.getStepDefinition(stepType);
    if (stepDef?.cost) {
      return stepCostToTier(stepDef.cost);
    }
  }

  // 2. Fall back to heuristics for built-in/unknown steps
  return inferCostFromHeuristics(node);
}

/**
 * Infers cost from heuristics for steps without declared cost.
 * This handles built-in steps, HTTP steps, and connector steps.
 */
function inferCostFromHeuristics(node: GraphNodeUnion): WorkflowCostTier {
  const stepType = node.stepType || node.type;

  // AI step types (prefix matching)
  if (stepType.startsWith('ai.') || stepType.startsWith('agent.')) {
    return 'heavy';
  }

  // Light built-in steps
  if (
    stepType.startsWith('data.') ||
    stepType.startsWith('elasticsearch.') ||
    stepType.startsWith('kibana.') ||
    stepType === 'wait' ||
    stepType === 'console' ||
    stepType === 'data-set'
  ) {
    return 'light';
  }

  // HTTP steps - analyze URL if available
  if (node.type === 'http') {
    return inferHttpStepCost(node);
  }

  // Atomic/connector steps - check connector type
  if (node.type === 'atomic') {
    return inferAtomicStepCost(node);
  }

  // Default for unknown step types
  return 'normal';
}

/**
 * Infers cost for HTTP steps by analyzing URL patterns.
 */
function inferHttpStepCost(node: GraphNodeUnion): WorkflowCostTier {
  // Access configuration safely - node may have 'configuration' property
  const config = (node as { configuration?: { with?: { url?: string; method?: string } } })
    .configuration?.with;
  if (!config) {
    return 'normal';
  }

  const { url, method } = config;

  // If URL is dynamic (contains template variables), we can't analyze it
  if (typeof url === 'string' && !url.includes('{{')) {
    // Check domain patterns for AI services
    if (AI_URL_PATTERNS.domains.some((pattern) => pattern.test(url))) {
      return 'heavy';
    }

    // Check path patterns for AI endpoints
    if (AI_URL_PATTERNS.paths.some((pattern) => pattern.test(url))) {
      return 'heavy';
    }
  }

  // Simple GET requests are typically light
  if (method === 'GET') {
    return 'light';
  }

  // POST/PUT could be anything - default to normal
  return 'normal';
}

/**
 * Infers cost for atomic/connector steps by checking connector type.
 */
function inferAtomicStepCost(node: GraphNodeUnion): WorkflowCostTier {
  // Access connectorTypeId safely
  const connectorTypeId = (node as { configuration?: { connectorTypeId?: string } }).configuration
    ?.connectorTypeId;

  if (connectorTypeId && AI_CONNECTOR_TYPES.has(connectorTypeId)) {
    return 'heavy';
  }

  return 'normal';
}

/**
 * Infers the overall cost tier for a workflow based on its steps.
 * The workflow cost is determined by the highest-cost step it contains.
 *
 * @param workflowDefinition - The workflow definition to analyze
 * @param stepRegistry - Optional step registry to look up declared step costs
 * @returns The inferred cost tier for the workflow
 *
 * @example
 * ```typescript
 * const cost = inferWorkflowCost(workflow.definition, workflowsExtensions);
 * const taskType = `workflow:run:${cost}`; // e.g., 'workflow:run:heavy'
 * ```
 */
export function inferWorkflowCost(
  workflowDefinition: WorkflowYaml,
  stepRegistry?: WorkflowsExtensionsServerPluginStart
): WorkflowCostTier {
  let maxCost: WorkflowCostTier = 'light';

  try {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);
    const nodes = workflowGraph.getAllNodes();

    for (const node of nodes) {
      const nodeCost = inferNodeCost(node, stepRegistry);
      maxCost = getHigherCost(maxCost, nodeCost);

      // Early exit optimization - if we hit heavy, that's the max
      if (maxCost === 'heavy') {
        return 'heavy';
      }
    }
  } catch {
    // If graph building fails, default to normal cost
    return 'normal';
  }

  return maxCost;
}

/**
 * Gets the task type name for a given base type and cost tier.
 *
 * @param baseType - The base task type (e.g., 'workflow:run')
 * @param tier - The cost tier
 * @returns The full task type name (e.g., 'workflow:run:heavy')
 */
export function getTaskTypeForCost(baseType: string, tier: WorkflowCostTier): string {
  return `${baseType}:${tier}`;
}
