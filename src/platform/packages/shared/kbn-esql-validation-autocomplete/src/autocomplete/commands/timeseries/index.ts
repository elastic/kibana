/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SuggestionRawDefinition } from '../../types';
import {
  getOverlapRange,
  specialIndicesToSuggestions,
  additionalSourcesSuggestions,
} from '../../helper';
import { CommandSuggestParams } from '../../../definitions/types';
import { isRestartingExpression, withinQuotes } from '../../../shared/helpers';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { metadataSuggestion, getMetadataSuggestions } from '../metadata';

export async function suggest({
  innerText,
  command,
  callbacks,
  getSources,
  getSourcesFromQuery,
}: CommandSuggestParams<'ts'>): Promise<SuggestionRawDefinition[]> {
  if (withinQuotes(innerText)) {
    return [];
  }

  const suggestions: SuggestionRawDefinition[] = [];

  const indexes = getSourcesFromQuery('index');
  // Function to add suggestions based on canRemoveQuote
  const addSuggestionsBasedOnQuote = (definitions: SuggestionRawDefinition[]) => {
    suggestions.push(...definitions);
  };

  const metadataSuggestions = getMetadataSuggestions(command, innerText);
  if (metadataSuggestions) {
    return metadataSuggestions;
  }

  const metadataOverlap = getOverlapRange(innerText, 'METADATA');

  // TS /
  if (indexes.length === 0) {
    const timeseriesIndices = await callbacks?.getTimeseriesIndices?.();
    if (!timeseriesIndices) {
      return [];
    }
    return specialIndicesToSuggestions(timeseriesIndices.indices);
  }
  // TS something /
  else if (indexes.length > 0 && /\s$/.test(innerText) && !isRestartingExpression(innerText)) {
    suggestions.push(metadataSuggestion);
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
  }
  // TS something MET/
  else if (indexes.length > 0 && /^TS\s+\S+\s+/i.test(innerText) && metadataOverlap) {
    suggestions.push(metadataSuggestion);
  }
  // TS someth/
  // TS something/
  // TS something, /
  else if (indexes.length) {
    const sources = await getSources();
    const additionalSuggestions = await additionalSourcesSuggestions(
      innerText,
      sources,
      indexes.map(({ name }) => name),
      []
    );
    addSuggestionsBasedOnQuote(additionalSuggestions);
  }

  return suggestions;
}
