/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Check if the current path is within the inputs.properties context
 * @param path - The YAML path array
 * @returns true if we're in inputs.properties context
 */
export function isInInputsPropertiesContext(path: (string | number)[]): boolean {
  // Check if path starts with ['inputs', 'properties'] or ['inputs', 'properties', ...]
  if (path.length < 2) {
    return false;
  }
  return path[0] === 'inputs' && path[1] === 'properties';
}

/**
 * Check if we're at a property definition level within inputs.properties
 * @param path - The YAML path array
 * @returns true if we're at a property definition (e.g., inputs.properties.myProperty)
 */
export function isAtInputPropertyDefinition(path: (string | number)[]): boolean {
  // Path should be: ['inputs', 'properties', propertyName, ...]
  return path.length >= 3 && path[0] === 'inputs' && path[1] === 'properties';
}

/**
 * Get the property name from the path if we're in inputs.properties context
 * @param path - The YAML path array
 * @returns The property name or null
 */
export function getInputPropertyName(path: (string | number)[]): string | null {
  if (isAtInputPropertyDefinition(path) && path.length >= 3) {
    return typeof path[2] === 'string' ? path[2] : null;
  }
  return null;
}
