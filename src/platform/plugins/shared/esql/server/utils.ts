/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ResolveIndexResponse, RecommendedQuery } from './types';

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

// console.log(checkExistence(esData, "logs*")); // true
// console.log(checkExistence(esData, "logs-")); // true (because "logs-*" would match)
// console.log(checkExistence(esData, "logs")); // false (exact match "logs" doesn't exist)
// console.log(checkExistence(esData, "logstash-0,movies")); // true
// console.log(checkExistence(esData, "logstash-0,nonexistent")); // false
// console.log(checkExistence(esData, "metrics-*")); // true
// console.log(checkExistence(esData, "nonexistent*")); // false
// console.log(checkExistence(esData, "logs-apache_error")); // true
// console.log(checkExistence(esData, ".alerts-security.alerts-default")); // true
// console.log(checkExistence(esData, ".alerts-security*")); // true
// console.log(checkExistence(esData, "kibana_sample_data_logs")); // true
// console.log(checkExistence(esData, "kibana_sample_data_flights,nonexistent,metrics-system.cpu-default")); // false
// console.log(checkExistence(esData, "logstash-")); // true (matches logstash-0 etc.)
// console.log(checkExistence(esData, "logstash-*")); // true (matches logstash-0 etc.)

/**
 * Creates a RegExp object from a given pattern string, handling wildcards (*).
 * @param pattern The pattern string (e.g., "logs*", "my_index").
 * @returns A RegExp object.
 */
export function createPatternRegex(pattern: string): RegExp {
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

export function findMatchingIndicesFromPattern(
  registry: Map<string, RecommendedQuery[]>,
  indexPattern: string
): string[] {
  const matchingIndices: string[] = [];
  const indexPatternRegex = createPatternRegex(indexPattern);

  for (const [indexName, _] of registry.entries()) {
    if (indexPatternRegex.test(indexName)) {
      matchingIndices.push(indexName);
    } else {
      const regex = createPatternRegex(indexName);
      if (regex.test(indexPattern)) {
        matchingIndices.push(indexName);
      }
    }
  }

  return matchingIndices;
}
