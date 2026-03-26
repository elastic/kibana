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

liquidEngine.registerFilter('entries', (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }
  return Object.entries(value).map(([k, v]) => ({ key: k, value: v }));
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
 * Find foreach context by looking for foreach steps in execution.
 * The server stores only { index, total } in state (not the full items array).
 * The foreach expression is stored in input.foreach, so we re-evaluate it
 * against the execution context to derive the items array.
 */
function findForeachContext(
  context: ExecutionContext
): { item: JsonValue; index: number; total: number; items: JsonArray } | null {
  for (const [, stepData] of Object.entries(context.steps)) {
    if (stepData.state && typeof stepData.state.index === 'number') {
      const index = stepData.state.index as number;
      const total = (stepData.state.total as number) ?? 0;

      // Try to get items from state directly (legacy path)
      if ('items' in stepData.state && Array.isArray(stepData.state.items)) {
        const items = stepData.state.items as JsonArray;
        return {
          item: items[index] ?? (items.length > 0 ? items[0] : null),
          index,
          total,
          items,
        };
      }

      // Re-evaluate the foreach expression from the step's input to derive items
      const foreachExpression = extractForeachExpression(stepData.input);
      if (foreachExpression) {
        const items = resolveForeachItems(foreachExpression, context);
        if (items) {
          return {
            item: items[index] ?? (items.length > 0 ? items[0] : null),
            index,
            total,
            items,
          };
        }
      }
    }
  }
  return null;
}

function extractForeachExpression(input: JsonValue | undefined): string | undefined {
  if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
    const { foreach: expression } = input as Record<string, unknown>;
    return typeof expression === 'string' ? expression : undefined;
  }
  return undefined;
}

function resolveForeachItems(
  foreachExpression: string,
  context: ExecutionContext
): JsonArray | null {
  try {
    let expression = foreachExpression.trim();
    const openIdx = expression.indexOf('{{');
    const closeIdx = expression.lastIndexOf('}}');
    if (openIdx !== -1 && closeIdx !== -1) {
      expression = expression.substring(openIdx + 2, closeIdx).trim();
    }
    const result = liquidEngine.evalValueSync(expression, context);
    if (Array.isArray(result)) {
      return result as JsonArray;
    }
    if (typeof result === 'string') {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed as JsonArray;
      }
    }
  } catch {
    // ignore evaluation errors
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
