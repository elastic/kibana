/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IndexAutocompleteItem, ESQLSourceResult, EsqlView } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { ESQLAstAllCommands, ESQLAstJoinCommand, ESQLSource } from '../../../types';
import type { ISuggestionItem } from '../../registry/types';
import { handleFragment } from './autocomplete/helpers';
import { pipeCompleteItem, commaCompleteItem } from '../../registry/complete_items';
import { withAutoSuggest } from './autocomplete/helpers';
import { EDITOR_MARKER } from '../constants';
import { metadataSuggestion } from '../../registry/options/metadata';
import { fuzzySearch } from './shared';
import { isAsExpression, Walker } from '../../../ast';
import { LeafPrinter } from '../../../pretty_print';

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
  sources: Array<{ name: string; isIntegration: boolean; title?: string; type?: string }>,
  queryString?: string
): ISuggestionItem[] =>
  sources.map(({ name, isIntegration, title, type }) => {
    let text = getSafeInsertSourceText(name);
    const isTimeseries = type === SOURCES_TYPES.TIMESERIES;
    let rangeToReplace: { start: number; end: number } | undefined;

    // If this is a timeseries source we should replace FROM with TS
    // With TS users can benefit from the timeseries optimizations
    if (isTimeseries && queryString) {
      text = `TS ${text}`;
      rangeToReplace = {
        start: 0,
        end: queryString.length + 1,
      };
    }

    return withAutoSuggest({
      label: title ?? name,
      text,
      asSnippet: isIntegration,
      kind: isIntegration ? 'Class' : 'Issue',
      detail: isIntegration
        ? i18n.translate('kbn-esql-language.esql.autocomplete.integrationDefinition', {
            defaultMessage: SOURCES_TYPES.INTEGRATION,
          })
        : i18n.translate('kbn-esql-language.esql.autocomplete.sourceDefinition', {
            defaultMessage: '{type}',
            values: {
              type: type ?? SOURCES_TYPES.INDEX,
            },
          }),
      sortText: 'A',
      // with filterText we are explicitly telling the Monaco editor's filtering engine
      //  to display the item when the text FROM  is present in the editor at the specified range,
      // even though the label is different.
      ...(rangeToReplace && { rangeToReplace, filterText: queryString }),
    });
  });

/**
 * Builds suggestion items for ES|QL views (GET _query/view).
 */
export const buildViewsDefinitions = (
  views: EsqlView[],
  alreadyUsed: string[] = []
): ISuggestionItem[] =>
  views
    .filter(({ name }) => !alreadyUsed.includes(name))
    .map(({ name }) => {
      const text = getSafeInsertSourceText(name);
      return withAutoSuggest({
        label: name,
        text,
        kind: 'Issue',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.viewDefinition', {
          defaultMessage: 'View',
        }),
        sortText: 'A-view',
      });
    });

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

export function getSourcesFromCommands(
  commands: ESQLAstAllCommands[],
  sourceType: 'index' | 'policy'
) {
  const sourceCommand = commands.find(({ name }) => name === 'from' || name === 'ts');
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  // the marker gets added in queries like "FROM "
  return args.filter(
    (arg) => arg.sourceType === sourceType && arg.name !== '' && arg.name !== EDITOR_MARKER
  );
}

export function getSourceSuggestions(
  sources: ESQLSourceResult[],
  alreadyUsed: string[],
  queryString?: string
) {
  // hide indexes that start with .
  return buildSourcesDefinitions(
    sources
      .filter(({ hidden, name }) => !hidden && !alreadyUsed.includes(name))
      .map(({ name, dataStreams, title, type }) => {
        return { name, isIntegration: Boolean(dataStreams && dataStreams.length), title, type };
      }),
    queryString
  );
}

export async function additionalSourcesSuggestions(
  queryText: string,
  sources: ESQLSourceResult[],
  ignored: string[],
  recommendedQuerySuggestions: ISuggestionItem[],
  views: EsqlView[] = []
) {
  const sourceNames = new Set([
    ...sources.map(({ name }) => name),
    ...views.map(({ name }) => name),
  ]);
  const suggestionsToAdd = await handleFragment(
    queryText,
    (fragment) => sourceExists(fragment, sourceNames),
    (_fragment, rangeToReplace) => {
      const sourceSuggestions = getSourceSuggestions(sources, ignored).map((suggestion) => ({
        ...suggestion,
        rangeToReplace,
      }));
      const viewSuggestions = buildViewsDefinitions(views, ignored).map((suggestion) => ({
        ...suggestion,
        rangeToReplace,
      }));
      return [...sourceSuggestions, ...viewSuggestions];
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
          withAutoSuggest({
            ...pipeCompleteItem,
            filterText: fragment,
            text: fragment + ' | ',
            rangeToReplace,
            sortText: '0',
          }),
          withAutoSuggest({
            ...commaCompleteItem,
            filterText: fragment,
            text: fragment + ', ',
            rangeToReplace,
          }),
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
    mainSuggestions.push(
      withAutoSuggest({
        label: index.name,
        text: index.name + ' ',
        kind: 'Issue',
        detail: i18n.translate(
          'kbn-esql-language.esql.autocomplete.specialIndexes.indexType.index',
          {
            defaultMessage: 'Index',
          }
        ),
        sortText: '0-INDEX-' + index.name,
      })
    );

    if (index.aliases) {
      for (const alias of index.aliases) {
        aliasSuggestions.push(
          withAutoSuggest({
            label: alias,
            text: alias + ' $0',
            asSnippet: true,
            kind: 'Issue',
            detail: i18n.translate(
              'kbn-esql-language.esql.autocomplete.specialIndexes.indexType.alias',
              {
                defaultMessage: 'Alias',
              }
            ),
            sortText: '1-ALIAS-' + alias,
          })
        );
      }
    }
  }

  return [...mainSuggestions, ...aliasSuggestions];
};

/**
 * Returns the source node from the target index of a JOIN command.
 * For example, in the following JOIN command, it returns the source node representing "lookup_index":
 * | LOOKUP JOIN lookup_index AS l ON source_index.id = l.id
 */
export const getLookupJoinSource = (command: ESQLAstJoinCommand): string | undefined => {
  const firstArg = command.args[0];
  const argumentToWalk = isAsExpression(firstArg) ? firstArg.args[0] : firstArg;

  const sourceNode = Walker.match(argumentToWalk, {
    type: 'source',
  });

  if (sourceNode) {
    return LeafPrinter.print(sourceNode);
  }
};
