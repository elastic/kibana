/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecommendedField, RecommendedQuery } from '@kbn/esql-types';
import { REGISTRY_EXTENSIONS_ROUTE } from '@kbn/esql-types';
import type { HttpStart } from '@kbn/core/public';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';
import { cacheParametrizedAsyncFunction } from './utils/cache';

const getEditorExtensionsFromRegistry = async (
  http: HttpStart,
  queryString: string,
  activeSolutionId: SolutionId
): Promise<{
  recommendedQueries: RecommendedQuery[];
  recommendedFields: RecommendedField[];
}> => {
  const encodedQuery = encodeURIComponent(queryString);
  const result = await http.get<{
    recommendedQueries: RecommendedQuery[];
    recommendedFields: RecommendedField[];
  }>(`${REGISTRY_EXTENSIONS_ROUTE}${activeSolutionId}/${encodedQuery}`);
  return result;
};

/**
 * Fetches editor extensions from the registry based on the provided query string and active solution ID.
 * @param queryString The query string to search for extensions.
 * @param activeSolutionId The active solution ID to filter extensions.
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the editor extensions.
 */
export const getEditorExtensions = cacheParametrizedAsyncFunction(
  getEditorExtensionsFromRegistry,
  (queryString, activeSolutionId) => `${queryString}-${activeSolutionId}`,
  1000 * 60 * 5, // Keep the value in cache for 5 minutes
  1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
);
