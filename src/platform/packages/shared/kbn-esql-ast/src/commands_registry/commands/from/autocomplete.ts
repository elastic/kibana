/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '../../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../utils/autocomplete/complete_items';
import {
  getSourcesFromCommands,
  getSourceSuggestions,
  additionalSourcesSuggestions,
} from '../../../definitions/sources_helpers';
import { metadataSuggestion, getMetadataSuggestions } from '../../options/metadata';
import { getRecommendedQueriesSuggestions } from '../../options/recommended_queries';
import { withinQuotes } from '../../utils/autocomplete';
import {
  type ISuggestionItem,
  type GetColumnsByTypeFn,
  type ICommandContext,
  ESQLFieldWithMetadata,
} from '../../types';
import { getOverlapRange, isRestartingExpression } from '../../../definitions/shared';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  getColumnsByType: GetColumnsByTypeFn,
  getSuggestedUserDefinedColumnName: (extraFieldNames?: string[] | undefined) => string,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (withinQuotes(query)) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  const indexes = getSourcesFromCommands([command], 'index');

  const metadataSuggestions = getMetadataSuggestions(command, query);
  if (metadataSuggestions) {
    return metadataSuggestions;
  }

  const metadataOverlap = getOverlapRange(query, 'METADATA');

  // FROM /
  if (indexes.length === 0) {
    suggestions.push(
      ...getSourceSuggestions(
        context?.sources ?? [],
        indexes.map(({ name }) => name)
      )
    );
  }
  // FROM something /
  else if (indexes.length > 0 && /\s$/.test(query) && !isRestartingExpression(query)) {
    suggestions.push(metadataSuggestion);
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
    suggestions.push(
      ...(await getRecommendedQueriesSuggestions(
        context?.editorExtensions ?? { recommendedFields: [], recommendedQueries: [] },
        getColumnsByType
      ))
    );
  }
  // FROM something MET/
  else if (indexes.length > 0 && /^FROM\s+\S+\s+/i.test(query) && metadataOverlap) {
    suggestions.push(metadataSuggestion);
  }
  // FROM someth/
  // FROM something/
  // FROM something, /
  else if (indexes.length) {
    const sources = context?.sources ?? [];

    const recommendedQuerySuggestions = await getRecommendedQueriesSuggestions(
      context?.editorExtensions ?? { recommendedFields: [], recommendedQueries: [] },
      getColumnsByType
    );
    const additionalSuggestions = await additionalSourcesSuggestions(
      query,
      sources,
      indexes.map(({ name }) => name),
      recommendedQuerySuggestions
    );
    suggestions.push(...additionalSuggestions);
  }

  return suggestions;
}
