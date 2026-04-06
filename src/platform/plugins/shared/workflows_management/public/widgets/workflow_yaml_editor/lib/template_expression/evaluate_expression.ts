/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { resolvePathValue } from './resolve_path_value';
import type { ExecutionContext } from '../execution_context/build_execution_context';

// Create a liquid engine instance with the same configuration as the server
const liquidEngine = createWorkflowLiquidEngine({
  strictFilters: true, // Match server-side behavior - error on unknown filters
  strictVariables: false,
});

// Register custom filters that match server-side exactly
liquidEngine.registerFilter('json_parse', (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
});

export interface EvaluateExpressionOptions {
  /** The full expression including filters (e.g., "steps.search.output.hits | json") */
  expression: string;
  /** The execution context to evaluate against */
  context: ExecutionContext;
  /** The current step ID if inside a foreach step */
  currentStepId?: string;
}

/**
 * Evaluate a template expression with filters using LiquidJS
 * This handles both simple paths and expressions with filters like "| json"
 * Also handles foreach.item by finding the current foreach step context
 */
export function evaluateExpression(options: EvaluateExpressionOptions): JsonValue | undefined {
  const { expression, context, currentStepId } = options;
  try {
    // Build enhanced context with foreach if needed
    const enhancedContext = buildEnhancedContext(context, currentStepId);

    // Use LiquidJS to evaluate the expression
    // This handles filters automatically (e.g., "steps.search.output | json")
    const result = liquidEngine.evalValueSync(expression, enhancedContext);
    return result as JsonValue;
  } catch (error) {
    // If liquid evaluation fails, try simple path resolution as fallback
    return fallbackPathResolution(expression, context);
  }
}

/**
 * Enhanced execution context with optional foreach support
 */
interface EnhancedExecutionContext extends ExecutionContext {
  foreach?: {
    item: JsonValue;
    index: number;
    total: number;
    items: JsonArray;
  };
}

/**
 * Build enhanced context with foreach.item support
 * This looks for ANY foreach step and adds foreach context if found
 * Note: We use the first foreach step found for simplicity (as requested by user)
 */
function buildEnhancedContext(
  context: ExecutionContext,
  _currentStepId?: string
): EnhancedExecutionContext {
  const enhancedContext: EnhancedExecutionContext = { ...context };

  // Always try to find foreach context (not dependent on current step ID)
  const foreachContext = findForeachContext(context);
  if (foreachContext) {
    enhancedContext.foreach = foreachContext;
  }

  return enhancedContext;
}

/**
 * Find foreach context by looking for foreach steps in execution
 * Returns the first foreach step found with its items
 */
function findForeachContext(
  context: ExecutionContext
): { item: JsonValue; index: number; total: number; items: JsonArray } | null {
  // Look through all steps to find foreach steps
  for (const [, stepData] of Object.entries(context.steps)) {
    // Check if this step has foreach state (items array)
    if (stepData.state && 'items' in stepData.state && Array.isArray(stepData.state.items)) {
      // This is a foreach step
      const items = stepData.state.items as JsonArray;
      // For simplicity, use the first item (as requested by user)
      return {
        item: items.length > 0 ? items[0] : null,
        index: 0,
        total: items.length,
        items,
      };
    }
  }
  return null;
}

/**
 * Fallback path resolution without filters
 * Used when LiquidJS evaluation fails
 */
function fallbackPathResolution(
  expression: string,
  context: ExecutionContext
): JsonValue | undefined {
  // Remove any filters for fallback
  const pipeIndex = expression.indexOf('|');
  const variablePath =
    pipeIndex >= 0 ? expression.substring(0, pipeIndex).trim() : expression.trim();

  // Parse path into segments
  const pathSegments = variablePath.split('.').filter(Boolean);

  return resolvePathValue(context as unknown as JsonObject, pathSegments);
}
