/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type {
  ESQLAstAllCommands,
  ESQLAstHighlightCommand,
  ESQLSingleAstItem,
} from '@elastic/esql/types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';
import { Location } from '../types';
import {
  getPosition,
  CaretPosition,
  canSuggestPrefix,
  HIGHLIGHT_DEFAULT_PREFIX,
  HIGHLIGHT_PREFIX_KEYWORD,
} from './utils';
import {
  onCompleteItem,
  withCompleteItem,
  buildAddValuePlaceholder,
  buildMapValueCompleteItem,
  newLineAndPipeCompleteItems,
} from '../complete_items';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { buildConstantsDefinitions } from '../../definitions/utils/literals';
import { suggestFieldsList } from '../../definitions/utils/autocomplete/fields_list';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';
import { suggestForExpression } from '../../definitions/utils';

/** Matches an ON list made of a lone `*`, which can only be followed by WITH or the end. */
const LONE_WILDCARD_ON_REGEX = /\bon\s+\*\s*$/i;

/** Matches the first entry of the ON list, still empty or being typed. */
const FIRST_ON_ENTRY_REGEX = /\bon\s*[^\s,]*$/i;

export const getQueryText = () =>
  i18n.translate('kbn-esql-language.commands.highlight.autocomplete.queryTextPlaceholder', {
    defaultMessage: 'The text to highlight',
  });

export const getQueryTextSnippet = () => `"$\{0:${getQueryText()}}"`;

const getWildcardFieldsSuggestion = (): ISuggestionItem =>
  withAutoSuggest({
    label: '*',
    text: '*',
    kind: 'Value',
    detail: i18n.translate('kbn-esql-language.commands.highlight.autocomplete.allFieldsDetail', {
      defaultMessage: 'All text and keyword fields',
    }),
    // Listed before the fields, which are sorted alphabetically within their own category.
    category: SuggestionCategory.RECOMMENDED_FIELD,
  });

const PREFIX_VALUE_SNIPPET = `"$\{0:${HIGHLIGHT_DEFAULT_PREFIX}}"`;
const PREFIX_MODIFIER_SNIPPET = `${HIGHLIGHT_PREFIX_KEYWORD} = ${PREFIX_VALUE_SNIPPET}`;

/**
 * Parameters accepted by the `WITH { ... }` map, mirroring the Elasticsearch highlighter
 * options. Built on demand so the descriptions are translated at runtime.
 */
const getHighlightMapParameters = (): MapParameters => ({
  analyzer: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.analyzerDescription',
      {
        defaultMessage: 'Analyzer used to re-analyze the ON fields before highlighting',
      }
    ),
    suggestions: [],
  },
  pre_tags: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.preTagsDescription',
      {
        defaultMessage: 'HTML tag to insert before highlighted text (default: <em>)',
        ignoreTag: true,
      }
    ),
    suggestions: [buildMapValueCompleteItem('<em>')],
  },
  post_tags: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.postTagsDescription',
      {
        defaultMessage: 'HTML tag to insert after highlighted text (default: </em>)',
        ignoreTag: true,
      }
    ),
    suggestions: [buildMapValueCompleteItem('</em>')],
  },
  number_of_fragments: {
    type: 'number',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.numberOfFragmentsDescription',
      { defaultMessage: 'Maximum number of fragments to return (default: 5)' }
    ),
    suggestions: [buildMapValueCompleteItem('5')],
  },
  fragment_size: {
    type: 'number',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.fragmentSizeDescription',
      { defaultMessage: 'Size of each fragment in characters (default: 100)' }
    ),
    suggestions: [buildMapValueCompleteItem('100')],
  },
  encoder: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.encoderDescription',
      { defaultMessage: 'Encoding for highlighted text: default or html (default: default)' }
    ),
    suggestions: [buildMapValueCompleteItem('default'), buildMapValueCompleteItem('html')],
  },
  boundary_scanner: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.boundaryScannerDescription',
      { defaultMessage: 'How to split fragments: sentence or word (default: sentence)' }
    ),
    suggestions: [buildMapValueCompleteItem('sentence'), buildMapValueCompleteItem('word')],
  },
  boundary_scanner_locale: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.boundaryScannerLocaleDescription',
      { defaultMessage: 'Locale for boundary scanning (default: Locale.ROOT)' }
    ),
    suggestions: [],
  },
  order: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.orderDescription',
      { defaultMessage: 'Order of fragments: none or score (default: none)' }
    ),
    suggestions: [buildMapValueCompleteItem('none'), buildMapValueCompleteItem('score')],
  },
  no_match_size: {
    type: 'number',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.noMatchSizeDescription',
      {
        defaultMessage:
          'Minimum characters to return when there is no match, extended to the next boundary (default: 0)',
      }
    ),
    suggestions: [buildMapValueCompleteItem('0')],
  },
  max_analyzed_offset: {
    type: 'number',
    description: i18n.translate(
      'kbn-esql-language.commands.highlight.autocomplete.maxAnalyzedOffsetDescription',
      { defaultMessage: 'Maximum character offset to analyze, or -1 to unset (default: -1)' }
    ),
    suggestions: [buildMapValueCompleteItem('-1')],
  },
});

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const highlightCommand = command as ESQLAstHighlightCommand;
  const innerText = query.substring(0, cursorPosition);

  if (!callbacks?.getByType) {
    return [];
  }

  const position = getPosition(query, highlightCommand, cursorPosition);

  switch (position) {
    case CaretPosition.PREFIX_VALUE: {
      // Cursor is after `prefix = `: suggest a placeholder quoted string
      return [
        {
          ...buildConstantsDefinitions(
            [PREFIX_VALUE_SNIPPET],
            '',
            undefined,
            undefined,
            SuggestionCategory.CONSTANT_VALUE
          )[0],
          label: i18n.translate(
            'kbn-esql-language.commands.highlight.autocomplete.customPrefixLabel',
            { defaultMessage: 'Custom prefix' }
          ),
          asSnippet: true,
        },
      ];
    }

    case CaretPosition.QUERY_EXPRESSION: {
      const expressionRoot = highlightCommand.queryExpression as ESQLSingleAstItem | undefined;

      const { suggestions, computed } = await suggestForExpression({
        query,
        expressionRoot,
        command,
        cursorPosition,
        location: Location.HIGHLIGHT_QUERY,
        context,
        callbacks,
        options: {
          preferredExpressionType: 'boolean',
          // A bare column is not a valid query expression on its own: the query must be a
          // string literal or a full-text function. Fields are still suggested inside
          // function arguments, e.g. MATCH(<field>, "query").
          suggestFields: false,
        },
      });

      // Offer the optional `prefix = "..."` modifier when no prefix or query is typed yet
      if (canSuggestPrefix(query, highlightCommand, cursorPosition)) {
        suggestions.push({
          label: 'prefix = "..."',
          text: PREFIX_MODIFIER_SNIPPET,
          kind: 'Keyword',
          detail: i18n.translate(
            'kbn-esql-language.commands.highlight.autocomplete.prefixModifierDetail',
            { defaultMessage: 'Custom column name prefix (default: highlight_)' }
          ),
          asSnippet: true,
          category: SuggestionCategory.COMMAND_MODIFIER,
        });
      }

      // Neither the query nor ON is mandatory, so with nothing typed yet the command can already
      // continue with ON or WITH, or end.
      if (computed.position === 'empty_expression') {
        suggestions.push(onCompleteItem, withCompleteItem, ...newLineAndPipeCompleteItems);
      }

      // The snippet stands for a whole query expression, so it makes no sense as a function
      // argument (MATCH(<field>, ...)). It stays available after an operator, where a string
      // literal is a valid operand (e.g. `"fox" AND `).
      if (computed.position === 'in_function') {
        return suggestions;
      }

      const stringSuggestion: ISuggestionItem = {
        ...buildConstantsDefinitions(
          [getQueryTextSnippet()],
          '',
          undefined,
          undefined,
          SuggestionCategory.CONSTANT_VALUE
        )[0],
        label: getQueryText(),
        asSnippet: true,
      };

      return [stringSuggestion, ...suggestions];
    }

    case CaretPosition.ON_KEYWORD: {
      return [onCompleteItem, withCompleteItem, ...newLineAndPipeCompleteItems];
    }

    case CaretPosition.ON_EXPRESSION: {
      // `*` is only valid on its own, so nothing but WITH or the end can follow it.
      if (LONE_WILDCARD_ON_REGEX.test(innerText)) {
        return [withCompleteItem, ...newLineAndPipeCompleteItems];
      }

      const fieldSuggestions = await suggestFieldsList(
        query,
        command,
        highlightCommand.highlightFields ?? [],
        Location.HIGHLIGHT,
        callbacks,
        context,
        cursorPosition,
        {
          afterCompleteSuggestions: [withCompleteItem],
          allowSingleColumnFields: true,
          // The ON list takes plain fields: no `col0 = ...` assignments.
          disableNewColumnSuggestion: true,
          preferredExpressionType: ['text', 'keyword'],
        }
      );

      return FIRST_ON_ENTRY_REGEX.test(innerText)
        ? [getWildcardFieldsSuggestion(), ...fieldSuggestions]
        : fieldSuggestions;
    }

    case CaretPosition.AFTER_WITH_KEYWORD: {
      return [buildAddValuePlaceholder('config')];
    }

    case CaretPosition.WITHIN_MAP_EXPRESSION: {
      return getCommandMapExpressionSuggestions(innerText, getHighlightMapParameters());
    }

    case CaretPosition.AFTER_COMMAND: {
      return newLineAndPipeCompleteItems;
    }

    default: {
      return [];
    }
  }
}
