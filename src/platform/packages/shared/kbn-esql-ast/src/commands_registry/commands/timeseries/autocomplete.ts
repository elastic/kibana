/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '../../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../utils/complete_items';
import { specialIndicesToSuggestions } from '../../../definitions/utils/sources';
import {
  getSourcesFromCommands,
  additionalSourcesSuggestions,
} from '../../../definitions/utils/sources';
import { metadataSuggestion, getMetadataSuggestions } from '../../options/metadata';
import { withinQuotes } from '../../../definitions/utils/autocomplete';
import { type ISuggestionItem, type ICommandContext, ICommandCallbacks } from '../../types';
import { getOverlapRange, isRestartingExpression } from '../../../definitions/utils/shared';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (withinQuotes(query)) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  const indexes = getSourcesFromCommands([command], 'index');
  // Function to add suggestions based on canRemoveQuote
  const addSuggestionsBasedOnQuote = (definitions: ISuggestionItem[]) => {
    suggestions.push(...definitions);
  };

  const metadataSuggestions = getMetadataSuggestions(command, query);
  if (metadataSuggestions) {
    return metadataSuggestions;
  }

  const metadataOverlap = getOverlapRange(query, 'METADATA');

  // TS /
  if (indexes.length === 0) {
    const timeseriesIndices = context?.timeSeriesSources;
    if (!timeseriesIndices) {
      return [];
    }
    return specialIndicesToSuggestions(timeseriesIndices);
  }
  // TS something /
  else if (indexes.length > 0 && /\s$/.test(query) && !isRestartingExpression(query)) {
    suggestions.push(metadataSuggestion);
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
  }
  // TS something MET/
  else if (indexes.length > 0 && /^TS\s+\S+\s+/i.test(query) && metadataOverlap) {
    suggestions.push(metadataSuggestion);
  }
  // TS someth/
  // TS something/
  // TS something, /
  else if (indexes.length) {
    const sources = context?.sources ?? [];
    const additionalSuggestions = await additionalSourcesSuggestions(
      query,
      sources,
      indexes.map(({ name }) => name),
      []
    );
    addSuggestionsBasedOnQuote(additionalSuggestions);
  }

  return suggestions;
}
