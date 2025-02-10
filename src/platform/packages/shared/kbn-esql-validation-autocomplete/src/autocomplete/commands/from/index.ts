/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metadataOption } from '../../../definitions/options';
import type { SuggestionRawDefinition } from '../../types';
import { getOverlapRange, handleFragment, removeQuoteForSuggestedSources } from '../../helper';
import { CommandSuggestParams } from '../../../definitions/types';
import { isRestartingExpression, sourceExists } from '../../../shared/helpers';
import {
  TRIGGER_SUGGESTION_COMMAND,
  buildOptionDefinition,
  buildSourcesDefinitions,
} from '../../factories';
import { ESQLSourceResult } from '../../../shared/types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';

export async function suggest({
  innerText,
  getSources,
  getRecommendedQueriesSuggestions,
  getSourcesFromQuery,
}: CommandSuggestParams<'from'>): Promise<SuggestionRawDefinition[]> {
  // // TODO - this is a workaround because it was too difficult to handle this case in a generic way :(
  // if (node && isSourceItem(node) && /\s/.test(node.name)) {
  //   // FROM " <suggest>"
  //   return [];
  // }

  const suggestions: SuggestionRawDefinition[] = [];

  const indexes = getSourcesFromQuery('index');
  const canRemoveQuote = innerText.includes('"');
  // Function to add suggestions based on canRemoveQuote
  const addSuggestionsBasedOnQuote = (definitions: SuggestionRawDefinition[]) => {
    suggestions.push(
      ...(canRemoveQuote ? removeQuoteForSuggestedSources(definitions) : definitions)
    );
  };

  const metadataOverlap = getOverlapRange(innerText, 'METADATA');

  // FROM /
  if (indexes.length === 0) {
    addSuggestionsBasedOnQuote(getSourceSuggestions(await getSources()));
  }
  // FROM something /
  else if (indexes.length > 0 && /\s$/.test(innerText) && !isRestartingExpression(innerText)) {
    suggestions.push(buildOptionDefinition(metadataOption));
    suggestions.push(commaCompleteItem);
    suggestions.push(pipeCompleteItem);
    suggestions.push(...(await getRecommendedQueriesSuggestions()));
  }
  // FROM something MET/
  else if (
    indexes.length > 0 &&
    /^FROM \S+\s+/i.test(innerText) &&
    metadataOverlap.start !== metadataOverlap.end
  ) {
    suggestions.push(buildOptionDefinition(metadataOption));
  }
  // FROM someth/
  // FROM something/
  // FROM something, /
  else if (indexes.length) {
    const sources = await getSources();

    const recommendedQuerySuggestions = await getRecommendedQueriesSuggestions();

    const suggestionsToAdd = await handleFragment(
      innerText,
      (fragment) =>
        sourceExists(fragment, new Set(sources.map(({ name: sourceName }) => sourceName))),
      (_fragment, rangeToReplace) => {
        return getSourceSuggestions(sources).map((suggestion) => ({
          ...suggestion,
          rangeToReplace,
        }));
      },
      (fragment, rangeToReplace) => {
        const exactMatch = sources.find(({ name: _name }) => _name === fragment);
        if (exactMatch?.dataStreams) {
          // this is an integration name, suggest the datastreams
          const definitions = buildSourcesDefinitions(
            exactMatch.dataStreams.map(({ name }) => ({ name, isIntegration: false }))
          );

          return canRemoveQuote ? removeQuoteForSuggestedSources(definitions) : definitions;
        } else {
          const _suggestions: SuggestionRawDefinition[] = [
            {
              ...pipeCompleteItem,
              filterText: fragment,
              text: fragment + ' | ',
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            },
            {
              ...commaCompleteItem,
              filterText: fragment,
              text: fragment + ', ',
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            },
            {
              ...buildOptionDefinition(metadataOption),
              filterText: fragment,
              text: fragment + ' METADATA ',
              asSnippet: false, // turn this off because $ could be contained within the source name
              rangeToReplace,
            },
            ...recommendedQuerySuggestions.map((suggestion) => ({
              ...suggestion,
              rangeToReplace,
              filterText: fragment,
              text: fragment + suggestion.text,
            })),
          ];
          return _suggestions;
        }
      }
    );
    addSuggestionsBasedOnQuote(suggestionsToAdd);
  }

  return suggestions;
}

function getSourceSuggestions(sources: ESQLSourceResult[]) {
  // hide indexes that start with .
  return buildSourcesDefinitions(
    sources
      .filter(({ hidden }) => !hidden)
      .map(({ name, dataStreams, title, type }) => {
        return { name, isIntegration: Boolean(dataStreams && dataStreams.length), title, type };
      })
  );
}
