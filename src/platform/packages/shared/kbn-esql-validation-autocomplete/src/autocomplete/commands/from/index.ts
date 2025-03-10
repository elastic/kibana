/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommandOption } from '@kbn/esql-ast';
import { isMarkerNode } from '../../../shared/context';
import { metadataOption } from '../../../definitions/options';
import type { SuggestionRawDefinition } from '../../types';
import { getOverlapRange, handleFragment, removeQuoteForSuggestedSources } from '../../helper';
import { CommandSuggestParams } from '../../../definitions/types';
import {
  isColumnItem,
  isOptionItem,
  isRestartingExpression,
  isSingleItem,
  sourceExists,
} from '../../../shared/helpers';
import {
  TRIGGER_SUGGESTION_COMMAND,
  buildFieldsDefinitions,
  buildOptionDefinition,
  buildSourcesDefinitions,
} from '../../factories';
import { ESQLSourceResult } from '../../../shared/types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { METADATA_FIELDS } from '../../../shared/constants';

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

  const metadataNode = command.args.find((arg) => isOptionItem(arg) && arg.name === 'metadata') as
    | ESQLCommandOption
    | undefined;

  // FROM index METADATA ... /
  if (metadataNode) {
    return suggestForMetadata(metadataNode, innerText);
  }

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
    /^FROM\s+\S+\s+/i.test(innerText) &&
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

async function suggestForMetadata(metadata: ESQLCommandOption, innerText: string) {
  const existingFields = new Set(metadata.args.filter(isColumnItem).map(({ name }) => name));
  const filteredMetaFields = METADATA_FIELDS.filter((name) => !existingFields.has(name));
  const suggestions: SuggestionRawDefinition[] = [];
  // FROM something METADATA /
  // FROM something METADATA field/
  // FROM something METADATA field, /
  if (
    metadata.args.filter((arg) => isSingleItem(arg) && !isMarkerNode(arg)).length === 0 ||
    isRestartingExpression(innerText)
  ) {
    suggestions.push(
      ...(await handleFragment(
        innerText,
        (fragment) => METADATA_FIELDS.includes(fragment),
        (_fragment, rangeToReplace) =>
          buildFieldsDefinitions(filteredMetaFields).map((suggestion) => ({
            ...suggestion,
            rangeToReplace,
          })),
        (fragment, rangeToReplace) => {
          const _suggestions = [
            {
              ...pipeCompleteItem,
              text: fragment + ' | ',
              filterText: fragment,
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            },
          ];
          if (filteredMetaFields.length > 1) {
            _suggestions.push({
              ...commaCompleteItem,
              text: fragment + ', ',
              filterText: fragment,
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            });
          }
          return _suggestions;
        }
      ))
    );
  } else {
    // METADATA field /
    if (existingFields.size > 0) {
      if (filteredMetaFields.length > 0) {
        suggestions.push(commaCompleteItem);
      }
      suggestions.push(pipeCompleteItem);
    }
  }

  return suggestions;
}
