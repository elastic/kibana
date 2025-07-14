/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { IndexAutocompleteItem } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { ESQLCommand, ESQLSource } from '../../types';
import type { ISuggestionItem, ESQLSourceResult } from '../../commands_registry/types';
import { handleFragment } from './autocomplete/helpers';
import { pipeCompleteItem, commaCompleteItem } from '../../commands_registry/complete_items';
import { EDITOR_MARKER } from '../../parser/constants';
import { TRIGGER_SUGGESTION_COMMAND } from '../../commands_registry/constants';
import { metadataSuggestion } from '../../commands_registry/options/metadata';
import { fuzzySearch } from './shared';

const removeSourceNameQuotes = (sourceName: string) =>
  sourceName.startsWith('"') && sourceName.endsWith('"') ? sourceName.slice(1, -1) : sourceName;

// Function to clean a single index string from failure stores
const cleanIndex = (inputIndex: string): string => {
  let cleaned = inputIndex.trim();

  // Remove '::data' suffix
  if (cleaned.endsWith('::data')) {
    cleaned = cleaned.slice(0, -6);
  }
  // Remove '::failures' suffix
  if (cleaned.endsWith('::failures')) {
    cleaned = cleaned.slice(0, -10);
  }
  return cleaned;
};

function getQuotedText(text: string) {
  return text.startsWith(`"`) && text.endsWith(`"`) ? text : `"${text}"`;
}

export function shouldBeQuotedSource(text: string) {
  // Based on lexer `fragment UNQUOTED_SOURCE_PART`
  return /[:"=|,[\]\/ \t\r\n]/.test(text);
}

function getSafeInsertSourceText(text: string) {
  return shouldBeQuotedSource(text) ? getQuotedText(text) : text;
}

export const buildSourcesDefinitions = (
  sources: Array<{ name: string; isIntegration: boolean; title?: string; type?: string }>
): ISuggestionItem[] =>
  sources.map(({ name, isIntegration, title, type }) => ({
    label: title ?? name,
    text: getSafeInsertSourceText(name),
    isSnippet: isIntegration,
    kind: isIntegration ? 'Class' : 'Issue',
    detail: isIntegration
      ? i18n.translate('kbn-esql-ast.esql.autocomplete.integrationDefinition', {
          defaultMessage: `Integration`,
        })
      : i18n.translate('kbn-esql-ast.esql.autocomplete.sourceDefinition', {
          defaultMessage: '{type}',
          values: {
            type: type ?? 'Index',
          },
        }),
    sortText: 'A',
    command: TRIGGER_SUGGESTION_COMMAND,
  }));

/**
 * Checks if the source exists in the provided sources set.
 * It supports both exact matches and fuzzy searches.
 *
 * @param index - The index to check, which can be a single value or a comma-separated list.
 * @param sources - A Set of source names to check against.
 * @returns true if the source exists, false otherwise.
 */

// The comma-separated index and the ::data or ::failures suffixes solution is temporary
// till we fix the AST for the quoted index names https://github.com/elastic/kibana/issues/222505.
export function sourceExists(index: string, sources: Set<string>) {
  if (index.startsWith('-')) {
    return true;
  }
  // Split the index by comma to handle multiple values and clean each part
  const individualIndices = index.split(',').map((item) => cleanIndex(item));
  // Check if all individual indices exist in sources
  const allExist = individualIndices.every((singleIndex) => {
    // First, check for exact match after removing source name quotes
    if (sources.has(removeSourceNameQuotes(singleIndex))) {
      return true;
    }
    // If not an exact match, perform a fuzzy search
    return Boolean(fuzzySearch(singleIndex, sources.keys()));
  });

  return allExist;
}

export function getSourcesFromCommands(commands: ESQLCommand[], sourceType: 'index' | 'policy') {
  const sourceCommand = commands.find(({ name }) => name === 'from' || name === 'ts');
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  // the marker gets added in queries like "FROM "
  return args.filter(
    (arg) => arg.sourceType === sourceType && arg.name !== '' && arg.name !== EDITOR_MARKER
  );
}

export function getSourceSuggestions(sources: ESQLSourceResult[], alreadyUsed: string[]) {
  // hide indexes that start with .
  return buildSourcesDefinitions(
    sources
      .filter(({ hidden, name }) => !hidden && !alreadyUsed.includes(name))
      .map(({ name, dataStreams, title, type }) => {
        return { name, isIntegration: Boolean(dataStreams && dataStreams.length), title, type };
      })
  );
}

export async function additionalSourcesSuggestions(
  queryText: string,
  sources: ESQLSourceResult[],
  ignored: string[],
  recommendedQuerySuggestions: ISuggestionItem[]
) {
  const suggestionsToAdd = await handleFragment(
    queryText,
    (fragment) =>
      sourceExists(fragment, new Set(sources.map(({ name: sourceName }) => sourceName))),
    (_fragment, rangeToReplace) => {
      return getSourceSuggestions(sources, ignored).map((suggestion) => ({
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

        return definitions;
      } else {
        const _suggestions: ISuggestionItem[] = [
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
            ...metadataSuggestion,
            filterText: fragment,
            text: fragment + ' METADATA ',
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
  return suggestionsToAdd;
}

// Treating lookup and time_series mode indices
export const specialIndicesToSuggestions = (
  indices: IndexAutocompleteItem[]
): ISuggestionItem[] => {
  const mainSuggestions: ISuggestionItem[] = [];
  const aliasSuggestions: ISuggestionItem[] = [];

  for (const index of indices) {
    mainSuggestions.push({
      label: index.name,
      text: index.name + ' ',
      kind: 'Issue',
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.specialIndexes.indexType.index', {
        defaultMessage: 'Index',
      }),
      sortText: '0-INDEX-' + index.name,
      command: TRIGGER_SUGGESTION_COMMAND,
    });

    if (index.aliases) {
      for (const alias of index.aliases) {
        aliasSuggestions.push({
          label: alias,
          text: alias + ' $0',
          kind: 'Issue',
          detail: i18n.translate('kbn-esql-ast.esql.autocomplete.specialIndexes.indexType.alias', {
            defaultMessage: 'Alias',
          }),
          sortText: '1-ALIAS-' + alias,
          command: TRIGGER_SUGGESTION_COMMAND,
        });
      }
    }
  }

  return [...mainSuggestions, ...aliasSuggestions];
};
