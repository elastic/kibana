/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * We get the list of all indices (source names) from ES.
 * This function generates index patterns for indices that share the same prefix.
 * For example, if we have indices like:
 * - logs-2023.01.01
 * - logs-2023.01.02
 * This function will generate the index pattern:
 * - logs-*
 * @param sourceNames all the available indices
 * @returns an array of index patterns
 */

export const generateIndexPatterns = (sourceNames: string[]): string[] => {
  const prefixCounts = new Map<string, number>();

  sourceNames.forEach((name) => {
    if (name.includes('-')) {
      const parts = name.split('-');
      if (parts.length > 1) {
        const prefix = parts[0];
        prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
      }
    }
  });

  // Only for indices that have more than one occurrence of the same prefix
  const patterns = new Set<string>();
  prefixCounts.forEach((count, prefix) => {
    if (count > 1) {
      patterns.add(`${prefix}-*`);
    }
  });

  const filteredPatterns = Array.from(patterns).filter((pattern) => !sourceNames.includes(pattern));

  return filteredPatterns.sort();
};
