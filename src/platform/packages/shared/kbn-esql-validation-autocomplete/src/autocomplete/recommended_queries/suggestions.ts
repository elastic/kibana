/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { RecommendedQuery } from '@kbn/esql-types';
import type { SuggestionRawDefinition, GetColumnsByTypeFn } from '../types';
import { getRecommendedQueries } from './templates';

export const getRecommendedQueriesSuggestionsFromStaticTemplates = async (
  getFieldsByType: GetColumnsByTypeFn,
  fromCommand: string = ''
): Promise<SuggestionRawDefinition[]> => {
  const fieldSuggestions = await getFieldsByType('date', [], {
    openSuggestions: true,
  });
  let timeField = '';
  if (fieldSuggestions.length) {
    timeField =
      fieldSuggestions?.find((field) => field.label === '@timestamp')?.label ||
      fieldSuggestions[0].label;
  }

  const recommendedQueries = getRecommendedQueries({ fromCommand, timeField });

  const suggestions: SuggestionRawDefinition[] = recommendedQueries.map((query) => {
    return {
      label: query.label,
      text: query.queryString,
      kind: 'Issue',
      detail: query.description,
      sortText: query?.sortText ?? 'E',
    };
  });

  return suggestions;
};

/**
 * This function maps the recommended queries from the extensions to the autocomplete suggestions.
 * @param recommendedQueriesExtensions, the recommended queries extensions to map
 * @returns SuggestionRawDefinition[], the mapped suggestions
 */
export const mapRecommendedQueriesFromExtensions = (
  recommendedQueriesExtensions: RecommendedQuery[]
): SuggestionRawDefinition[] => {
  const suggestions: SuggestionRawDefinition[] = recommendedQueriesExtensions.map((extension) => {
    return {
      label: extension.name,
      text: extension.query,
      detail: extension.description ?? '',
      kind: 'Issue',
      sortText: 'D',
    };
  });

  return suggestions;
};

/**
 * This function extracts the templates from the recommended queries extensions.
 * The templates are the recommended queries without the source command (FROM).
 * This is useful for showing the templates in the autocomplete suggestions when the users have already typed the FROM command.
 * @param recommendedQueriesExtensions, the recommended queries extensions to extract the templates from
 * @returns SuggestionRawDefinition[], the templates extracted from the recommended queries extensions
 */
export const getRecommendedQueriesTemplatesFromExtensions = (
  recommendedQueriesExtensions: RecommendedQuery[]
): SuggestionRawDefinition[] => {
  if (!recommendedQueriesExtensions || !recommendedQueriesExtensions.length) {
    return [];
  }

  // the templates are the recommended queries without the source command (FROM)
  const recommendedQueriesTemplates: SuggestionRawDefinition[] = recommendedQueriesExtensions.map(
    (recommendedQuery) => {
      const queryParts = recommendedQuery.query.split('|');
      // remove the first part (the FROM command)
      return {
        label: recommendedQuery.name,
        text: `|${queryParts.slice(1).join('|')}`,
        detail: recommendedQuery.description ?? '',
        kind: 'Issue',
        sortText: 'D',
      };
    }
  );

  return recommendedQueriesTemplates;
};
