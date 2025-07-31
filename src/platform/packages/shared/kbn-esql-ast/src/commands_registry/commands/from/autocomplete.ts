/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '../../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import {
  getSourcesFromCommands,
  getSourceSuggestions,
  additionalSourcesSuggestions,
} from '../../../definitions/utils/sources';
import { metadataSuggestion, getMetadataSuggestions } from '../../options/metadata';
import { getRecommendedQueriesSuggestions } from '../../options/recommended_queries';
import { withinQuotes } from '../../../definitions/utils/autocomplete/helpers';
import { type ISuggestionItem, type ICommandContext, ICommandCallbacks } from '../../types';
import { getOverlapRange, isRestartingExpression } from '../../../definitions/utils/shared';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  if (withinQuotes(innerText) || !callbacks?.getByType) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  const indexes = getSourcesFromCommands([command], 'index');

  const metadataSuggestions = getMetadataSuggestions(command, innerText);
  if (metadataSuggestions) {
    return metadataSuggestions;
  }

  const metadataOverlap = getOverlapRange(innerText, 'METADATA');

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
  else if (indexes.length > 0 && /\s$/.test(innerText) && !isRestartingExpression(innerText)) {
    suggestions.push(metadataSuggestion);
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
    suggestions.push(
      ...(await getRecommendedQueriesSuggestions(
        context?.editorExtensions ?? { recommendedFields: [], recommendedQueries: [] },
        callbacks?.getByType
      ))
    );
  }
  // FROM something MET/
  else if (indexes.length > 0 && /^FROM\s+\S+\s+/i.test(innerText) && metadataOverlap) {
    suggestions.push(metadataSuggestion);
  }
  // FROM someth/
  // FROM something/
  // FROM something, /
  else if (indexes.length) {
    const sources = context?.sources ?? [];

    const recommendedQuerySuggestions = await getRecommendedQueriesSuggestions(
      context?.editorExtensions ?? { recommendedFields: [], recommendedQueries: [] },
      callbacks?.getByType
    );
    const additionalSuggestions = await additionalSourcesSuggestions(
      innerText,
      sources,
      indexes.map(({ name }) => name),
      recommendedQuerySuggestions
    );
    suggestions.push(...additionalSuggestions);
  }

  return suggestions;
}
