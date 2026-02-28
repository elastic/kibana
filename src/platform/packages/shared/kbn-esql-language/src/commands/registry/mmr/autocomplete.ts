/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isMap, isOptionNode } from '../../../ast/is';
import type {
  ESQLAstAllCommands,
  ESQLAstItem,
  ESQLAstMmrCommand,
  ESQLCommandOption,
} from '../../../types';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';
import {
  columnExists,
  getFunctionsSuggestions,
  getFieldsSuggestions,
  getLiteralsSuggestions,
  handleFragment,
} from '../../definitions/utils/autocomplete/helpers';
import { onCompleteItem, pipeCompleteItem, withCompleteItem } from '../complete_items';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';
import { Location } from '../types';

enum MmrPosition {
  AFTER_MMR_KEYWORD = 'after_mmr_keyword',
  AFTER_QUERY_VECTOR = 'after_query_vector',
  AFTER_ON_KEYWORD = 'after_on_keyword',
  AFTER_FIELD = 'after_field',
  AFTER_LIMIT_KEYWORD = 'after_limit_keyword',
  AFTER_LIMIT_VALUE = 'after_limit_value',
  AFTER_WITH_KEYWORD = 'after_with_keyword',
  WITHIN_OPTIONS = 'within_options',
  AFTER_COMMAND = 'after_command',
}

const MMR_VECTOR_TYPES = ['dense_vector'];

const queryVectorSuggestion: ISuggestionItem = {
  label: 'query vector',
  text: '[${0:0.1}, ${1:0.2}]::dense_vector ',
  asSnippet: true,
  kind: 'Value',
  detail: i18n.translate('kbn-esql-language.commands.mmr.autocomplete.queryVectorSuggestion', {
    defaultMessage: 'Example query vector',
  }),
};

async function getVectorFieldSuggestions(
  innerText: string,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  const controlAndLiteralSuggestions = getLiteralsSuggestions(MMR_VECTOR_TYPES, Location.MMR, {
    includeDateLiterals: false,
    includeCompatibleLiterals: true,
    addComma: false,
    advanceCursorAndOpenSuggestions: false,
    supportsControls: true,
    variables: context?.variables,
  });

  const functionSuggestions = getFunctionsSuggestions({
    location: Location.MMR,
    types: MMR_VECTOR_TYPES,
    options: {},
    context,
    callbacks,
  });

  if (!callbacks?.getByType) {
    const contextField = context?.columns?.keys().next().value as string | undefined;
    const label = contextField || 'field';
    return [
      {
        label,
        text: `${label} `,
        kind: 'Field',
        detail: i18n.translate('kbn-esql-language.commands.mmr.autocomplete.fieldSuggestion', {
          defaultMessage: 'Example field',
        }),
      },
      ...controlAndLiteralSuggestions,
      ...functionSuggestions,
    ];
  }

  const fieldSuggestions = await getFieldsSuggestions(MMR_VECTOR_TYPES, callbacks.getByType, {
    addSpaceAfterField: true,
    openSuggestions: true,
  });

  const filteredFieldSuggestions = context?.columns
    ? fieldSuggestions.filter((suggestion) => columnExists(suggestion.label, context))
    : fieldSuggestions;

  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment, context),
    (_fragment, rangeToReplace) => [
      ...filteredFieldSuggestions.map((suggestion) => ({
        ...suggestion,
        rangeToReplace,
      })),
      ...controlAndLiteralSuggestions,
      ...functionSuggestions,
    ],
    () => [...controlAndLiteralSuggestions, ...functionSuggestions]
  );
}

const limitKeywordSuggestion: ISuggestionItem = {
  label: 'LIMIT',
  text: 'LIMIT ',
  kind: 'Keyword',
  detail: i18n.translate('kbn-esql-language.commands.mmr.autocomplete.limitKeywordSuggestion', {
    defaultMessage: 'Limit',
  }),
};

const limitValueSuggestion: ISuggestionItem = {
  label: '10',
  text: '10 ',
  kind: 'Value',
  detail: i18n.translate('kbn-esql-language.commands.mmr.autocomplete.limitValueSuggestion', {
    defaultMessage: 'Example limit',
  }),
};

const lambdaMapSuggestion: ISuggestionItem = {
  label: 'lambda',
  text: '{ "lambda": ${0:0.5} }',
  asSnippet: true,
  kind: 'Value',
  detail: i18n.translate('kbn-esql-language.commands.mmr.autocomplete.lambdaMapSuggestion', {
    defaultMessage: 'MMR options configuration',
  }),
};

function isAstItemIncomplete(item: ESQLAstItem | undefined): boolean {
  if (!item) {
    return true;
  }

  if (Array.isArray(item)) {
    return item.length === 0 || isAstItemIncomplete(item[0]);
  }

  return item.incomplete;
}

function getPosition(command: ESQLAstMmrCommand): MmrPosition {
  const onOption = command.args.find(
    (arg) => isOptionNode(arg) && arg.name.toLowerCase() === 'on'
  ) as ESQLCommandOption;
  const limitOption = command.args.find(
    (arg) => isOptionNode(arg) && arg.name.toLowerCase() === 'limit'
  ) as ESQLCommandOption;
  const withOption = command.args.find(
    (arg) => isOptionNode(arg) && arg.name.toLowerCase() === 'with'
  ) as ESQLCommandOption;

  if (withOption) {
    const map = isMap(withOption.args[0]) ? withOption.args[0] : undefined;

    if (!map || (map.incomplete && !map.text)) {
      return MmrPosition.AFTER_WITH_KEYWORD;
    }

    if (map.incomplete) {
      return MmrPosition.WITHIN_OPTIONS;
    }

    return MmrPosition.AFTER_COMMAND;
  }

  if (limitOption) {
    const limitValue = limitOption.args[0];
    if (isAstItemIncomplete(limitValue)) {
      return MmrPosition.AFTER_LIMIT_KEYWORD;
    }
    return MmrPosition.AFTER_LIMIT_VALUE;
  }

  if (onOption) {
    const onField = onOption.args[0];
    if (isAstItemIncomplete(onField)) {
      return MmrPosition.AFTER_ON_KEYWORD;
    }
    return MmrPosition.AFTER_FIELD;
  }

  if (command.queryVector) {
    if (command.queryVector.incomplete) {
      return MmrPosition.AFTER_MMR_KEYWORD;
    }
    return MmrPosition.AFTER_QUERY_VECTOR;
  }

  return MmrPosition.AFTER_MMR_KEYWORD;
}

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const mmrCommand = command as ESQLAstMmrCommand;
  const position = getPosition(mmrCommand);

  switch (position) {
    case MmrPosition.AFTER_MMR_KEYWORD:
      return [
        queryVectorSuggestion,
        ...getLiteralsSuggestions(MMR_VECTOR_TYPES, Location.MMR, {
          includeDateLiterals: false,
          includeCompatibleLiterals: true,
          addComma: false,
          advanceCursorAndOpenSuggestions: false,
          supportsControls: true,
          variables: context?.variables,
        }),
        ...getFunctionsSuggestions({
          location: Location.MMR,
          types: MMR_VECTOR_TYPES,
          options: {},
          context,
          callbacks,
        }),
        onCompleteItem,
      ];

    case MmrPosition.AFTER_QUERY_VECTOR:
      return [onCompleteItem];

    case MmrPosition.AFTER_ON_KEYWORD:
      return getVectorFieldSuggestions(innerText, callbacks, context);

    case MmrPosition.AFTER_FIELD:
      return [limitKeywordSuggestion];

    case MmrPosition.AFTER_LIMIT_KEYWORD:
      return [limitValueSuggestion];

    case MmrPosition.AFTER_LIMIT_VALUE:
      return [withCompleteItem, pipeCompleteItem];

    case MmrPosition.AFTER_WITH_KEYWORD:
      return [lambdaMapSuggestion];

    case MmrPosition.WITHIN_OPTIONS: {
      const availableParameters: MapParameters = {
        lambda: {
          type: 'number',
          description: i18n.translate(
            'kbn-esql-language.commands.mmr.autocomplete.lambdaDescription',
            {
              defaultMessage: 'MMR lambda value',
            }
          ),
          suggestions: [
            {
              label: '0.5',
              text: '0.5',
              kind: 'Value',
              detail: i18n.translate(
                'kbn-esql-language.commands.mmr.autocomplete.lambdaSuggestion',
                {
                  defaultMessage: 'Example lambda',
                }
              ),
            },
          ],
        },
      };

      return getCommandMapExpressionSuggestions(innerText, availableParameters, true);
    }

    case MmrPosition.AFTER_COMMAND:
      return [pipeCompleteItem];

    default:
      return [];
  }
}
