/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ResolveIndexResponse } from '@kbn/esql-types';

/**
 * Returns a boolean if the pattern exists in the sources.
 * @param pattern The pattern string (e.g., "logs*", "my_index").
 * @param sources The ResolveIndexResponse object containing indices, aliases, and data streams.
 * @returns A boolean indicating if the pattern exists in the sources.
 */
export function checkSourceExistence(sources: ResolveIndexResponse, inputString: string): boolean {
  const searchTerms = inputString.split(',').map((term) => term.trim());

  for (const searchTerm of searchTerms) {
    let found = false;

    // Check in indices
    if (sources.indices) {
      for (const index of sources.indices) {
        if (
          searchTerm === index.name ||
          (searchTerm.endsWith('*') && index.name.startsWith(searchTerm.slice(0, -1))) ||
          (searchTerm.endsWith('-*') && index.name.startsWith(searchTerm.slice(0, -1)))
        ) {
          found = true;
          break;
        }
      }
    }
    if (found) continue;

    // Check in aliases
    if (sources.aliases) {
      for (const alias of sources.aliases) {
        if (
          searchTerm === alias.name ||
          (searchTerm.endsWith('*') && alias.name.startsWith(searchTerm.slice(0, -1))) ||
          (searchTerm.endsWith('-*') && alias.name.startsWith(searchTerm.slice(0, -1)))
        ) {
          found = true;
          break;
        }
      }
    }
    if (found) continue;

    // Check in data_streams
    if (sources.data_streams) {
      for (const dataStream of sources.data_streams) {
        if (
          searchTerm === dataStream.name ||
          (searchTerm.endsWith('*') && dataStream.name.startsWith(searchTerm.slice(0, -1))) ||
          (searchTerm.endsWith('-*') && dataStream.name.startsWith(searchTerm.slice(0, -1)))
        ) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return false; // If even one search term is not found, return false
    }
  }

  return true; // All search terms were found
}

/**
 * Creates a RegExp object from a given pattern string, handling wildcards (*).
 * @param pattern The pattern string (e.g., "logs*", "my_index").
 * @returns A RegExp object.
 */
function createPatternRegex(pattern: string): RegExp {
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (escapedPattern.endsWith('\\*')) {
    // If the pattern ends with '*', remove it and create a regex that matches the prefix
    const prefix = escapedPattern.slice(0, -2); // Remove the escaped '*'
    // Match prefix followed by anything, up to the end of the string
    return new RegExp(`^${prefix}.*$`);
  } else {
    // Exact match if no '*' at the end
    // Match the entire string exactly
    return new RegExp(`^${escapedPattern}$`);
  }
}

/**
 * Finds matches from the registry, given a pattern.
 * @param registry The registry map containing index names and their corresponding queries.
 * @param pattern The pattern string (e.g., "logs*", "my_index", "logs-02122024").
 * @returns An array of matching index names.
 */
export function findMatchingIndicesFromPattern<T>(
  registry: Map<string, T[]>,
  indexPattern: string
): string[] {
  const matchingIndices: string[] = [];
  const indexPatternRegex = createPatternRegex(indexPattern);

  for (const [registryId, _] of registry.entries()) {
    const index = registryId.split('>')[1] || registryId; // Extract the index from the registryId
    if (indexPatternRegex.test(index)) {
      matchingIndices.push(index);
    } else {
      const regex = createPatternRegex(index);
      if (regex.test(indexPattern)) {
        matchingIndices.push(index);
      }
    }
  }

  return matchingIndices;
}
