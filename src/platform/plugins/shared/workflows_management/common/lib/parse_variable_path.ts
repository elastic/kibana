/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALLOWED_KEY_REGEX, PROPERTY_PATH_REGEX } from './regex';

export function validateVariablePath(path: string) {
  return ALLOWED_KEY_REGEX.test(path);
}

export interface ParsedVariablePath {
  errors?: string[];
  propertyPath: string | null;
  filters: string[];
}

// Receives a variable path e.g. 'items[0].name' or 'items[0].name | title' or 'items[0].name | title | uppercase'
// Tries to parse the path into a property path and filters
// Returns null if the path is invalid
// Returns an object with the property path and filters if the path is valid
// TODO: should be refactored to use liquidjs parser
export function parseVariablePath(path: string): ParsedVariablePath | null {
  const errors: string[] = [];
  // Trim whitespace
  const trimmedPath = path.trim();

  // Split by pipe, but we need to be careful about pipes inside parentheses
  const parts = splitByPipeRespectingParentheses(trimmedPath);

  if (parts.length === 0) {
    return null;
  }

  const propertyPath = parts[0].trim();

  // Validate the property path part
  if (!PROPERTY_PATH_REGEX.test(propertyPath)) {
    errors.push(`Invalid property path: ${propertyPath}`);
  }

  const filters = parts
    .slice(1)
    .map((filter) => filter.trim())
    .filter((filter) => filter.length > 0);

  // Validate each filter name (basic validation)
  for (const filter of filters) {
    const filterName = filter.split('(')[0].trim();
    // Check if filter name follows JavaScript identifier rules (no numbers at start, no $ at start, no special chars except _)
    if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(filterName)) {
      errors.push(`Invalid filter name: ${filterName}`);
    }
  }

  if (errors.length > 0) {
    return {
      errors,
      propertyPath: null,
      filters: [],
    };
  }

  return {
    propertyPath,
    filters,
  };
}

function splitByPipeRespectingParentheses(input: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let parenDepth = 0;
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const prevChar = i > 0 ? input[i - 1] : '';

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      currentPart += char;
    } else if (inQuotes && char === quoteChar && prevChar !== '\\') {
      inQuotes = false;
      quoteChar = '';
      currentPart += char;
    } else if (!inQuotes && char === '(') {
      parenDepth++;
      currentPart += char;
    } else if (!inQuotes && char === ')') {
      parenDepth--;
      currentPart += char;
    } else if (!inQuotes && char === '|' && parenDepth === 0) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  return parts;
}
