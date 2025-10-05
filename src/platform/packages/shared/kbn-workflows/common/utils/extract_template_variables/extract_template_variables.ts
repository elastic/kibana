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
const LIQUID_ENGINE_CONFIG = { strictVariables: true };
const DUMMY_VALUE = 'dummy';
const UNDEFINED_VARIABLE_REGEX = /undefined variable: (.+)/;

// Initialize Liquid engine
const engine = new Liquid(LIQUID_ENGINE_CONFIG);

/**
 * Extracts all Liquid variables from a template string.
 *
 * Liquid's rendering aborts on the first undefined variable, so we need to create a context structure that allows rendering to continue.
 * Uses a try-catch approach where undefined variables are caught,
 * added to the result set, and then created in the context to allow
 *
 * @param template - The template string to analyze
 * @returns Array of unique variable paths found in the template
 */
export function extractTemplateVariables(template: string): string[] {
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
        // Not an undefined variable error - rethrow
        throw error;
      }

      const variablePath = match[1].trim();
      foundVariables.add(variablePath);

      // Create context structure for this variable so rendering can continue
      createContextStructure(context, variablePath);
    }
  }

  return Array.from(foundVariables);
}

/**
 * Parses a Liquid variable path into its component parts.
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
 *
 * @private
 */
function createContextStructure(context: Record<string, any>, path: string): void {
  const parts = parseVariablePath(path);
  let current: any = context;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLastPart = i === parts.length - 1;

    if (isLastPart) {
      // Set dummy value for the leaf node
      if (!(key in current)) {
        current[key] = DUMMY_VALUE;
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
