/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstAllCommands } from '../../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import { specialIndicesToSuggestions } from '../../../definitions/utils/sources';
import {
  getSourcesFromCommands,
  additionalSourcesSuggestions,
} from '../../../definitions/utils/sources';
import { metadataSuggestion, getMetadataSuggestions } from '../../options/metadata';
import { getRecommendedQueriesSuggestions } from '../../options/recommended_queries';
import { withinQuotes } from '../../../definitions/utils/autocomplete/helpers';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { getOverlapRange, isRestartingExpression } from '../../../definitions/utils/shared';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  if (withinQuotes(innerText)) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  const indexes = getSourcesFromCommands([command], 'index');
  // Function to add suggestions based on canRemoveQuote
  const addSuggestionsBasedOnQuote = (definitions: ISuggestionItem[]) => {
    suggestions.push(...definitions);
  };

  const metadataSuggestions = getMetadataSuggestions(command, innerText);
  if (metadataSuggestions) {
    return metadataSuggestions;
  }

  const metadataOverlap = getOverlapRange(innerText, 'METADATA');

  // TS /
  if (indexes.length === 0) {
    const timeseriesIndices = context?.timeSeriesSources;
    if (!timeseriesIndices) {
      return [];
    }
    return specialIndicesToSuggestions(timeseriesIndices);
  }
  // TS something /
  else if (indexes.length > 0 && /\s$/.test(innerText) && !isRestartingExpression(innerText)) {
    suggestions.push(metadataSuggestion);
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
    suggestions.push(
      ...(await getRecommendedQueriesSuggestions(
        context?.editorExtensions ?? { recommendedFields: [], recommendedQueries: [] }
      ))
    );
  }
  // TS something MET/
  else if (indexes.length > 0 && /^TS\s+\S+\s+/i.test(innerText) && metadataOverlap) {
    suggestions.push(metadataSuggestion);
  }
  // TS someth/
  // TS something/
  // TS something, /
  else if (indexes.length) {
    const timeSeriesSources =
      context?.timeSeriesSources?.map(({ name }) => ({ name, hidden: false })) ?? [];
    const recommendedQuerySuggestions = await getRecommendedQueriesSuggestions(
      context?.editorExtensions ?? { recommendedFields: [], recommendedQueries: [] }
    );
    const additionalSuggestions = await additionalSourcesSuggestions(
      innerText,
      timeSeriesSources,
      indexes.map(({ name }) => name),
      recommendedQuerySuggestions
    );
    addSuggestionsBasedOnQuote(additionalSuggestions);
  }

  return suggestions;
}
