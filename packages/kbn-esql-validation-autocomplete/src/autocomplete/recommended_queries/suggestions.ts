/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SuggestionRawDefinition, GetColumnsByTypeFn } from '../types';
import { getRecommendedQueries } from './templates';

export const getRecommendedQueriesSuggestions = async (
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
      sortText: 'D',
    };
  });

  return suggestions;
};
