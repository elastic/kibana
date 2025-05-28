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
  removeQuoteForSuggestedSources,
  getSourceSuggestions,
  additionalSourcesSuggestions,
} from '../../helper';
import { CommandSuggestParams } from '../../../definitions/types';
import { isRestartingExpression } from '../../../shared/helpers';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { metadataSuggestion, getMetadataSuggestions } from '../metadata';

export async function suggest({
  innerText,
  command,
  getSources,
  getRecommendedQueriesSuggestions,
  getSourcesFromQuery,
}: CommandSuggestParams<'from'>): Promise<SuggestionRawDefinition[]> {
  if (/\".*$/.test(innerText)) {
    // FROM "<suggest>"
    return [];
  }

  const suggestions: SuggestionRawDefinition[] = [];

  const indexes = getSourcesFromQuery('index');
  const canRemoveQuote = innerText.includes('"');
  // Function to add suggestions based on canRemoveQuote
  const addSuggestionsBasedOnQuote = (definitions: SuggestionRawDefinition[]) => {
    suggestions.push(
      ...(canRemoveQuote ? removeQuoteForSuggestedSources(definitions) : definitions)
    );
  };

  const metadataSuggestions = getMetadataSuggestions(command, innerText);
  if (metadataSuggestions) {
    return metadataSuggestions;
  }

  const metadataOverlap = getOverlapRange(innerText, 'METADATA');

  // FROM /
  if (indexes.length === 0) {
    addSuggestionsBasedOnQuote(getSourceSuggestions(await getSources()));
  }
  // FROM something /
  else if (indexes.length > 0 && /\s$/.test(innerText) && !isRestartingExpression(innerText)) {
    suggestions.push(metadataSuggestion);
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
    suggestions.push(...(await getRecommendedQueriesSuggestions()));
  }
  // FROM something MET/
  else if (indexes.length > 0 && /^FROM\s+\S+\s+/i.test(innerText) && metadataOverlap) {
    suggestions.push(metadataSuggestion);
  }
  // FROM someth/
  // FROM something/
  // FROM something, /
  else if (indexes.length) {
    const sources = await getSources();

    const recommendedQuerySuggestions = await getRecommendedQueriesSuggestions();
    const additionalSuggestions = await additionalSourcesSuggestions(
      innerText,
      sources,
      recommendedQuerySuggestions
    );
    addSuggestionsBasedOnQuote(additionalSuggestions);
  }

  return suggestions;
}
