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
import { METADATA_FIELDS } from '../../shared/constants';

export const getRecommendedQueriesSuggestionsFromStaticTemplates = async (
  getFieldsByType: GetColumnsByTypeFn,
  fromCommand: string = ''
): Promise<SuggestionRawDefinition[]> => {
  const [fieldSuggestions, textFieldSuggestions] = await Promise.all([
    getFieldsByType(['date'], [], { openSuggestions: true }),
    // get text fields separately to avoid mixing them with date fields
    getFieldsByType(['text'], [], { openSuggestions: true }),
  ]);

  let timeField = '';
  let categorizationField: string | undefined = '';

  if (fieldSuggestions.length) {
    timeField =
      fieldSuggestions?.find((field) => field.label === '@timestamp')?.label ||
      fieldSuggestions[0].label;
  }

  if (textFieldSuggestions.length) {
    categorizationField = getCategorizationField(textFieldSuggestions.map((field) => field.label));
  }

  const recommendedQueries = getRecommendedQueries({
    fromCommand,
    timeField,
    categorizationField,
  });

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
      detail: extension.name ?? '',
      ...(extension.description ? { documentation: { value: extension.description } } : {}),
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
        detail: recommendedQuery.name ?? '',
        ...(recommendedQuery.description
          ? { documentation: { value: recommendedQuery.description } }
          : {}),
        kind: 'Issue',
        sortText: 'D',
      };
    }
  );

  return recommendedQueriesTemplates;
};

/**
 * This function returns the categorization field from the list of fields.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first field from the list,
 * Assumes text fields have been passed in the `fields` array.
 *
 * This function is a duplicate of the one in src/platform/packages/shared/kbn-aiops-utils.
 * It is included here to avoid build errors due to bazel
 *
 * TODO: Remove this function once the bazel issue is resolved.
 *
 * @param fields, the list of fields to check
 * @returns string | undefined, the categorization field if found, otherwise undefined
 */

export function getCategorizationField(fields: string[]): string | undefined {
  const fieldPriority = ['message', 'error.message', 'event.original'];
  const fieldSet = new Set(fields);
  for (const field of fieldPriority) {
    if (fieldSet.has(field)) {
      return field;
    }
  }

  // Filter out metadata fields
  const filteredFields = fields.filter((field) => !METADATA_FIELDS.includes(field));
  return filteredFields[0] ?? undefined;
}
