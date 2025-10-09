/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Liquid } from 'liquidjs';

// Constants
const DUMMY_VALUE = 'dummy';
const UNDEFINED_VARIABLE_REGEX = /undefined variable: [^,]+/;

// Lazy initialization - only create when needed
let engineInstance: Liquid | null = null;

function getLiquidEngine(): Liquid {
  if (!engineInstance) {
    engineInstance = new Liquid({ strictVariables: true, strictFilters: false });
  }
  return engineInstance;
}

/**
 * Extracts all Liquid variables from a template string.
 *
 * Liquid's rendering aborts on the first undefined variable, so we need to create a context structure that allows rendering to continue.
 * Uses a try-catch approach where undefined variables are caught,
 * added to the result set, and then created in the context to allow
 *
 * @param template - The template string to analyze
 * @returns Array of unique variable paths found in the template. If the template is invalid, returns an empty array.
 */
export function extractTemplateVariables(template: string): string[] {
  try {
    const engine = getLiquidEngine();
    const tokens = engine.parse(template);
    const context: Record<string, any> = {};
    const foundVariables = new Set<string>();

    // Continue rendering until all variables are discovered
    while (true) {
      try {
        engine.renderSync(tokens, context);
        break; // Success - no more undefined variables
      } catch (error: any) {
        const match = UNDEFINED_VARIABLE_REGEX.exec(error.message);
        if (!match) {
          // Not an undefined variable error - return found variables
          return Array.from(foundVariables);
        }

        const variablePath = match[1].trim();
        // Check if we've already processed this variable to prevent infinite loops
        if (foundVariables.has(variablePath)) {
          // Detected potential infinite loop: variable was already processed
          return Array.from(foundVariables);
        }

        foundVariables.add(variablePath);
        // Create context structure for this variable so rendering can continue
        createContextStructure(context, variablePath, template);
      }
    }

    return Array.from(foundVariables);
  } catch (error) {
    // If template parsing fails, return empty array
    return [];
  }
}

/**
 * Normalizes a Liquid variable path into its component parts.
 *
 * Handles various path formats:
 * - Dot notation: `user.name` → `["user", "name"]`
 * - Bracket notation with strings: `user["first-name"]` → `["user", "first-name"]`
 * - Bracket notation with numbers: `items[0]` → `["items", "0"]`
 * - Mixed notation: `user.profile["last-name"]` → `["user", "profile", "last-name"]`
 *
 * @param path - The variable path to parse
 * @returns Array of path components
 *
 * @private
 */
function parseVariablePath(path: string): string[] {
  const parts: string[] = [];
  const pathRegex = /\[(?:"([^"]+)"|'([^']+)'|(\d+))\]|([^.]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pathRegex.exec(path))) {
    if (match[1] !== undefined) {
      parts.push(match[1]); // double-quoted string
    } else if (match[2] !== undefined) {
      parts.push(match[2]); // single-quoted string
    } else if (match[3] !== undefined) {
      parts.push(match[3]); // numeric index
    } else if (match[4] !== undefined) {
      parts.push(match[4]); // plain identifier
    }
  }

  return parts;
}

/**
 * Creates a nested object structure for a given path and fills the leaf with a dummy value.
 *
 * This function ensures that the context object has the proper nested structure
 * to satisfy Liquid's variable resolution, allowing rendering to continue.
 *
 * @param context - The context object to modify
 * @param path - The variable path to create structure for
 * @param template - The template string to analyze for loop context
 *
 * @private
 */
function createContextStructure(
  context: Record<string, any>,
  path: string,
  template: string
): void {
  const parts = parseVariablePath(path);
  let current: any = context;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLastPart = i === parts.length - 1;

    if (isLastPart) {
      // Set dummy value for the leaf node
      if (!(key in current)) {
        // Check if this path is used in a for loop and this is the last part
        const loopVariable = getLoopVariableForParts(parts, template);
        if (loopVariable) {
          // Create an array with dummy objects that have the properties accessed in the loop
          const dummyObject = createDummyObjectForLoop(loopVariable, template);
          current[key] = [dummyObject];
        } else {
          current[key] = DUMMY_VALUE;
        }
      }
    } else {
      // Ensure intermediate nodes are objects
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}

/**
 * Gets the loop variable for given path parts if it's used in a for loop.
 * As Liquid normalizes the path, we need to use a generic approach to find any for loop that matches the path structure.
 *
 * @param parts - The path parts to check
 * @param template - The template string to analyze
 * @returns The loop variable name if used in a loop, null otherwise
 *
 * @private
 */
function getLoopVariableForParts(parts: string[], template: string): string | null {
  // Create a flexible regex that matches any for loop with the same path structure
  // This handles both bracket and dot notation, and various path formats
  const pathPattern = parts
    .map((part, index) => {
      // First part should not be wrapped with dots or brackets
      if (index === 0) {
        return part;
      }
      // For numeric parts, match both bracket and dot notation
      if (/^\d+$/.test(part)) {
        return `(?:\\[${part}\\]|\\.${part})`;
      }
      // For string parts, match both bracket and dot notation
      return `(?:\\["${part}"\\]|\\['${part}'\\]|\\.${part})`;
    })
    .join('');

  const forLoopRegex = new RegExp(`{%\\s*for\\s+(\\w+)\\s+in\\s+[^%]*${pathPattern}[^%]*%}`, 'gi');

  const match = forLoopRegex.exec(template);
  return match ? match[1] : null;
}

/**
 * Creates a dummy object for loop iteration with properties that are accessed in the loop.
 * Uses a generic approach to find all properties accessed on the loop variable.
 *
 * @param loopVariable - The loop variable name (e.g., "item")
 * @param template - The template string to analyze
 * @returns A dummy object with properties accessed in the loop
 *
 * @private
 */
function createDummyObjectForLoop(loopVariable: string, template: string): Record<string, any> {
  const dummyObject: Record<string, any> = {};

  // Generic regex to find any property access on the loop variable
  // Matches patterns like: variable.property, variable["property"], variable['property']
  const propertyAccessRegex = new RegExp(
    `${loopVariable}\\.(\\w+)|${loopVariable}\\["([^"]+)"\\]|${loopVariable}\\['([^']+)'\\]`,
    'gi'
  );

  let match;
  const properties = new Set<string>();

  // Find all property accesses on the loop variable
  while ((match = propertyAccessRegex.exec(template))) {
    // Extract the property name from any of the three capture groups
    const propertyName = match[1] || match[2] || match[3];
    if (propertyName) {
      properties.add(propertyName);
    }
  }

  // Add dummy values for all found properties
  properties.forEach((prop) => {
    dummyObject[prop] = DUMMY_VALUE;
  });

  return dummyObject;
}
