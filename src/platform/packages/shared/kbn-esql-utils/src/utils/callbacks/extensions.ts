/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecommendedField, RecommendedQuery, ESQLRegistrySolutionId } from '@kbn/esql-types';
import { REGISTRY_EXTENSIONS_ROUTE } from '@kbn/esql-types';
import type { HttpStart } from '@kbn/core/public';
import { Parser, isSource } from '@elastic/esql';
import { cacheParametrizedAsyncFunction } from './utils/cache';

interface EditorExtensions {
  recommendedQueries: RecommendedQuery[];
  recommendedFields: RecommendedField[];
}

/**
 * Single-pass analysis of the query string: parses the AST once and returns
 * whether the source is complete, the index pattern, and the command name.
 * Returns undefined when the source is incomplete or missing.
 */
export const analyzeSourceQuery = (
  queryString: string
): { indexPattern: string; commandName: string } | undefined => {
  if (!queryString.trim()) return undefined;
  try {
    const { root } = Parser.parse(queryString);
    const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
    if (!sourceCommand) return undefined;

    let lastSourceMax = -1;
    const sourceNames: string[] = [];
    for (const arg of sourceCommand.args) {
      if (!Array.isArray(arg) && isSource(arg)) {
        lastSourceMax = Math.max(lastSourceMax, arg.location.max);
        sourceNames.push(arg.name);
      }
    }

    if (lastSourceMax < 0 || queryString.length <= lastSourceMax + 1) {
      return undefined;
    }

    const indexPattern = [...new Set(sourceNames)].join(',');
    if (!indexPattern) return undefined;

    return { indexPattern, commandName: sourceCommand.name.toUpperCase() };
  } catch {
    return undefined;
  }
};

const getEditorExtensionsFromRegistry = async (
  http: HttpStart,
  queryString: string,
  activeSolutionId: ESQLRegistrySolutionId
): Promise<EditorExtensions> => {
  const encodedQuery = encodeURIComponent(queryString);
  const result = await http.get<EditorExtensions>(
    `${REGISTRY_EXTENSIONS_ROUTE}${activeSolutionId}/${encodedQuery}`
  );
  return result;
};

const cachedGetEditorExtensions = cacheParametrizedAsyncFunction(
  getEditorExtensionsFromRegistry,
  (_http, queryString, activeSolutionId) => `${queryString}-${activeSolutionId}`,
  1000 * 60 * 10, // Keep the value in cache for 10 minutes
  1000 * 60 * 5 // Refresh the cache in the background only if 5 minutes passed since the last call
);

/**
 * Fetches editor extensions from the registry based on the provided query string and active solution ID.
 * @param queryString The query string to search for extensions.
 * @param activeSolutionId The active solution ID to filter extensions.
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the editor extensions.
 * Results are cached by index pattern so they are computed once per source and reused
 * across all consumers. While the user is still typing the source name the function
 * returns an empty result immediately without making any HTTP requests.
 */
export const getEditorExtensions = (
  http: HttpStart,
  queryString: string,
  activeSolutionId: ESQLRegistrySolutionId
): Promise<EditorExtensions> => {
  const analysis = analyzeSourceQuery(queryString);
  if (!analysis) {
    // Still fetch from the server so standalone queries are returned
    return cachedGetEditorExtensions(http, '_', activeSolutionId);
  }
  // Normalize to a minimal query so the HTTP URL is always identical for a
  // given index pattern — even when the cache triggers a background refresh
  // with a later, longer query string.
  const { commandName, indexPattern } = analysis;
  return cachedGetEditorExtensions(http, `${commandName} ${indexPattern}`, activeSolutionId);
};
