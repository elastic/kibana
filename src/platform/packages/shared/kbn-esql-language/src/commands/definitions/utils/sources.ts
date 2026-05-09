/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLCallbacks,
  IndexAutocompleteItem,
  ESQLSourceResult,
  EsqlView,
} from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { EsqlQuery } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import type { ESQLAstAllCommands, ESQLAstJoinCommand, ESQLSource } from '@elastic/esql/types';
import { isAsExpression, Walker, LeafPrinter, Parser } from '@elastic/esql';
import type { ISuggestionItem } from '../../registry/types';
import { pipeCompleteItem, commaCompleteItem } from '../../registry/complete_items';
import { ESQL_APPLY_TEXT_REPLACEMENT_COMMAND } from '../../registry/constants';
import { findFinalWord, withAutoSuggest } from './autocomplete/helpers';
import { EDITOR_MARKER } from '../constants';
import { metadataSuggestion } from '../../registry/options/metadata';
import { fuzzySearch } from './shared';
import { computePrefixRange } from '../../../language/autocomplete/utils/prefix_range';

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
  sources: Array<{
    name: string;
    isIntegration: boolean;
    title?: string;
    description?: string;
    links?: Array<{ label: string; url: string }>;
    type?: string;
  }>,
  sourceReplacementContext?: {
    textBeforeCursor: string;
    commandStart: number;
  }
): ISuggestionItem[] => {
  const sourceCommandContext = sourceReplacementContext
    ? {
        commandStart: sourceReplacementContext.commandStart,
        prefixRangeStart: computePrefixRange(sourceReplacementContext.textBeforeCursor).range.start,
      }
    : undefined;

  return sources.map(({ name, isIntegration, title, description, links, type }) => {
    const text = getSafeInsertSourceText(name);
    const isTimeseries = type === SOURCES_TYPES.TIMESERIES;
    let command: ISuggestionItem['command'];

    if (isTimeseries && sourceCommandContext) {
      // The command runs after Monaco inserts `text`, so include the inserted source length.
      const replaceEnd = sourceCommandContext.prefixRangeStart + text.length;

      command = {
        // Monaco command payloads require a title.
        title: 'Apply text replacement',
        id: ESQL_APPLY_TEXT_REPLACEMENT_COMMAND,
        arguments: [
          {
            replacementText: `TS ${text}`,
            // Command arguments are string maps; the editor command parses them.
            replaceStart: String(sourceCommandContext.commandStart),
            replaceEnd: String(replaceEnd),
          },
        ],
      };
    }

    // Build markdown documentation from description and links (shown in detail popup)
    const linkParts = links?.length ? links.map(({ label, url }) => `[${label}](${url})`) : [];
    const parts = [
      ...linkParts,
      ...(description && linkParts.length > 0 ? [''] : []),
      ...(description ? [description] : []),
    ];

    const documentation = parts.length > 0 ? { value: parts.join('\n') } : undefined;

    // Map type to Monaco CompletionItemKind for visual differentiation
    const kindByType = new Map<string, ISuggestionItem['kind']>([
      [SOURCES_TYPES.WIRED_STREAM, 'Folder'],
      [SOURCES_TYPES.CLASSIC_STREAM, 'Class'],
    ]);

    const kind: ISuggestionItem['kind'] =
      kindByType.get(type ?? '') ?? (isIntegration ? 'Class' : 'Issue');

    return withAutoSuggest({
      label: title ?? name,
      text,
      asSnippet: isIntegration,
      kind,
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
      documentation,
      ...(command && { command }),
    });
  });
};

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

/**
 * Returns true when a wired stream has been used as a source in the query.
 */
export async function hasWiredStreamsInQuery(
  query: string,
  callbacks: Pick<ESQLCallbacks, 'getSources'> = {}
): Promise<boolean> {
  const { getSources } = callbacks;
  if (!getSources) {
    return false;
  }

  // Parse the query to get the sources used in the query.
  const esqlQuery = EsqlQuery.fromSrc(query);
  const sourcesInQuery = getSourcesFromCommands(esqlQuery.ast.commands, 'index');
  if (sourcesInQuery.length === 0) {
    return false;
  }

  // Get the available sources, this operations should not be expensive as it is cached.
  const availableSources = await getSources();
  const availableWiredStreams = new Set(
    availableSources
      .filter((source) => source.type === SOURCES_TYPES.WIRED_STREAM)
      .map((source) => source.name)
  );

  // Check if any of the sources used in the query are streams.
  return sourcesInQuery.some((source) => sourceExists(source.name, availableWiredStreams));
}

export function getSourceSuggestions(
  sources: ESQLSourceResult[],
  alreadyUsed: string[],
  sourceReplacementContext?: {
    textBeforeCursor: string;
    commandStart: number;
  }
) {
  // hide indexes that start with .
  return buildSourcesDefinitions(
    sources
      .filter(({ hidden, name }) => !hidden && !alreadyUsed.includes(name))
      .map(({ name, dataStreams, title, description, links, type }) => {
        return {
          name,
          isIntegration: Boolean(dataStreams && dataStreams.length),
          title,
          description,
          links,
          type,
        };
      }),
    sourceReplacementContext
  );
}

export async function additionalSourcesSuggestions(
  queryText: string,
  sources: ESQLSourceResult[],
  ignored: string[],
  recommendedQuerySuggestions: ISuggestionItem[],
  views: EsqlView[] = [],
  sourceReplacementContext?: {
    textBeforeCursor: string;
    commandStart: number;
  }
) {
  const sourceNames = new Set([
    ...sources.map(({ name }) => name),
    ...views.map(({ name }) => name),
  ]);
  const prefix = findFinalWord(queryText);
  const isComplete = prefix ? sourceExists(prefix, sourceNames) : false;

  if (isComplete) {
    const exactMatch = sources.find(({ name }) => name === prefix);

    if (exactMatch?.dataStreams) {
      return buildSourcesDefinitions(
        exactMatch.dataStreams.map(({ name }) => ({ name, isIntegration: false }))
      );
    }

    return [
      withAutoSuggest({
        ...pipeCompleteItem,
        filterText: prefix,
        text: prefix + ' | ',
      }),
      withAutoSuggest({
        ...commaCompleteItem,
        filterText: prefix,
        text: prefix + ', ',
      }),
      {
        ...metadataSuggestion,
        filterText: prefix,
        text: prefix + ' METADATA ',
      },
      ...recommendedQuerySuggestions.map((suggestion) =>
        suggestion.text
          ? {
              ...suggestion,
              filterText: prefix,
              text: prefix + suggestion.text,
            }
          : suggestion
      ),
    ];
  }

  const sourceSuggestions = getSourceSuggestions(sources, ignored, sourceReplacementContext);
  const viewSuggestions = buildViewsDefinitions(views, ignored);

  return [...sourceSuggestions, ...viewSuggestions];
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
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.sourceDefinition', {
          defaultMessage: '{type}',
          values: {
            type: index.mode ?? SOURCES_TYPES.INDEX,
          },
        }),
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

export function getIndexSourcesFromQuery(query: string): string[] {
  try {
    const { root } = Parser.parse(query);
    return getSourcesFromCommands(root.commands, 'index').map(({ name }) => name);
  } catch {
    return [];
  }
}
