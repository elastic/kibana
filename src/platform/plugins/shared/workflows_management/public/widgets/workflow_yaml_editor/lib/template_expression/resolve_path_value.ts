/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Resolve a value from an object using a path array
 * e.g., resolvePath({ steps: { stepA: { output: { bla: 'value' } } } }, ['steps', 'stepA', 'output', 'bla'])
 * returns 'value'
 */
export function resolvePathValue(context: Record<string, any>, path: string[]): any {
  if (path.length === 0) {
    return context;
  }

  let current: any = context;

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

/**
 * Truncate large objects/arrays for preview display
 * Limits depth and number of properties to prevent huge tooltips
 */
export function truncateForDisplay(
  value: any,
  options: {
    maxDepth?: number;
    maxProperties?: number;
    maxArrayItems?: number;
    currentDepth?: number;
  } = {}
): any {
  const { maxDepth = 5, maxProperties = 15, maxArrayItems = 5, currentDepth = 0 } = options;

  // Max depth reached
  if (currentDepth >= maxDepth) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `[Array(${value.length})]`;
      }
      const keys = Object.keys(value);
      return `{Object with ${keys.length} properties}`;
    }
    return value;
  }

  // Null or primitive
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Array
  if (Array.isArray(value)) {
    const truncated = value.slice(0, maxArrayItems).map((item) =>
      truncateForDisplay(item, {
        maxDepth,
        maxProperties,
        maxArrayItems,
        currentDepth: currentDepth + 1,
      })
    );

    if (value.length > maxArrayItems) {
      truncated.push(`... ${value.length - maxArrayItems} more items`);
    }

    return truncated;
  }

  // Object
  const keys = Object.keys(value);
  const truncatedObj: Record<string, any> = {};
  const keysToShow = keys.slice(0, maxProperties);

  for (const key of keysToShow) {
    truncatedObj[key] = truncateForDisplay(value[key], {
      maxDepth,
      maxProperties,
      maxArrayItems,
      currentDepth: currentDepth + 1,
    });
  }

  if (keys.length > maxProperties) {
    truncatedObj['...'] = `${keys.length - maxProperties} more properties`;
  }

  return truncatedObj;
}

/**
 * Format value as JSON string for display
 */
export function formatValueAsJson(value: any, truncate: boolean = true): string {
  const displayValue = truncate ? truncateForDisplay(value) : value;

  try {
    return JSON.stringify(displayValue, null, 2);
  } catch (error) {
    return String(displayValue);
  }
}
