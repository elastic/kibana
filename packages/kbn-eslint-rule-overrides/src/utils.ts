/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';

/**
 * Utility functions for path manipulation and config handling.
 */

/**
 * Finds the project root by looking for package.json or .eslintrc.js
 */
export function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    try {
      // Check for common root indicators
      const hasPackageJson = require.resolve(path.join(currentDir, 'package.json'));
      const hasEslintConfig = require.resolve(path.join(currentDir, '.eslintrc.js'));

      if (hasPackageJson || hasEslintConfig) {
        return currentDir;
      }
    } catch {
      // Continue searching up the directory tree
    }

    currentDir = path.dirname(currentDir);
  }

  // Fallback to process.cwd() if no root found
  return process.cwd();
}

/**
 * Deeply merges two objects, with special handling for arrays.
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
        result[key] = [...targetValue, ...sourceValue] as any;
      } else if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        targetValue &&
        typeof targetValue === 'object'
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}
