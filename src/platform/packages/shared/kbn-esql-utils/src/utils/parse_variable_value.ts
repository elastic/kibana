/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parses a variable value and converts it to the appropriate type:
 * - Arrays remain as arrays (string[] or number[] based on content)
 * - String arrays in bracket notation are parsed to proper arrays
 * - Numeric strings are converted to numbers
 * - Regular strings remain as strings
 *
 * @param value - The value to parse
 * @returns Parsed value as string | number | string[] | number[]
 */
export function parseVariableValue(value: unknown): string | number | string[] | number[] {
  // Check if value is already an array
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    // Try to parse as JSON array first
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsedArray = JSON.parse(value);
        if (Array.isArray(parsedArray)) {
          // Check if all elements are numeric to determine array type
          const allNumeric = parsedArray.every(
            (item: any) =>
              (typeof item === 'string' && !isNaN(Number(item))) || typeof item === 'number'
          );

          if (allNumeric) {
            // Convert to number array
            return parsedArray.map((item: any) => Number(item));
          } else {
            // Keep as string array
            return parsedArray.map((item: any) => String(item));
          }
        }
      } catch (e) {
        // If JSON parsing fails, try to parse as comma-separated values inside brackets
        const innerContent = value.slice(1, -1); // Remove brackets
        if (innerContent.trim()) {
          // Split by comma and trim each item
          const items = innerContent.split(',').map((item) => item.trim());

          // Check if all items are numeric to determine array type
          const allNumeric = items.every((item) => !isNaN(Number(item)));

          if (allNumeric) {
            // Convert to number array
            return items.map((item) => Number(item));
          } else {
            // Keep as string array
            return items;
          }
        } else {
          // Empty array case
          return [];
        }
      }
    } else {
      // Check if it's a numeric string
      return !isNaN(Number(value)) ? Number(value) : value;
    }
  }

  // For any other type, return as-is (though this shouldn't happen in normal usage)
  return value as string | number | string[] | number[];
}
