/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { RecommendedQuery } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../commands/registry/types';

/**
 * This function maps the recommended queries from the extensions to the autocomplete suggestions.
 * @param recommendedQueriesExtensions, the recommended queries extensions to map
 * @returns ISuggestionItem[], the mapped suggestions
 */
export const mapRecommendedQueriesFromExtensions = (
  recommendedQueriesExtensions: RecommendedQuery[]
): ISuggestionItem[] => {
  const suggestions: ISuggestionItem[] = recommendedQueriesExtensions.map((extension) => {
    return {
      label: extension.name,
      text: extension.query,
      detail: extension.name ?? '',
      ...(extension.description ? { documentation: { value: extension.description } } : {}),
      kind: 'Issue',
      sortText: 'D',
    };
  });

  return suggestions;
};
