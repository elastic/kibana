/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';
import {
  commaCompleteItem,
  pipeCompleteItem,
  withCompleteItem,
  minMaxValueCompleteItem,
  noneValueCompleteItem,
} from '../complete_items';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { EDITOR_MARKER } from '../../definitions/constants';
import { isColumn } from '../../../ast/is';
import { ESQL_STRING_TYPES } from '../../definitions/types';
import { columnExists, handleFragment } from '../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands, ESQLAstFuseCommand } from '../../../types';
import type { ICommandCallbacks } from '../types';
import { type ISuggestionItem, type ICommandContext } from '../types';
import {
  extractFuseArgs,
  findCommandOptionByName,
  immediatelyAfterOptionField,
  immediatelyAfterOptionFieldsList,
} from './utils';

enum FusePosition {
  BEFORE_NEW_ARGUMENT = 'before_new_argument',
  SCORE_BY = 'score_by',
  KEY_BY = 'key_by',
  GROUP_BY = 'group_by',
  WITH = 'with',
}

function getPosition(innerText: string, command: ESQLAstFuseCommand): FusePosition {
  const { scoreBy, keyBy, groupBy, withOption } = extractFuseArgs(command);

  if ((scoreBy && scoreBy.incomplete) || immediatelyAfterOptionField(innerText, 'score by')) {
    return FusePosition.SCORE_BY;
  }

  if ((groupBy && groupBy.incomplete) || immediatelyAfterOptionField(innerText, 'group by')) {
    return FusePosition.GROUP_BY;
  }

  if (
    (keyBy && keyBy.incomplete) ||
    immediatelyAfterOptionFieldsList(innerText, 'key by') ||
    keyBy?.text.includes(EDITOR_MARKER)
  ) {
    return FusePosition.KEY_BY;
  }

  if (withOption && withOption.incomplete) {
    return FusePosition.WITH;
  }

  return FusePosition.BEFORE_NEW_ARGUMENT;
}

// FUSE <fuse_method> SCORE BY <score_column> GROUP BY <group_column> KEY BY <key_columns> WITH <options>
export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const fuseCommand = command as ESQLAstFuseCommand;

  const innerText = query.substring(0, cursorPosition);

  const position = getPosition(innerText, fuseCommand);

  switch (position) {
    // FUSE arguments can be suggested in any order, except for <fuse_method> which should come first if present.
    // <fuse_method>, SCORE BY, KEY BY, GROUP BY, WITH
    case FusePosition.BEFORE_NEW_ARGUMENT:
      return fuseArgumentsAutocomplete(fuseCommand);

    // SCORE BY suggests a single field of double type
    case FusePosition.SCORE_BY:
      return await scoreByAutocomplete(innerText, callbacks, context);

    // GROUP BY suggests a single field of string type
    case FusePosition.GROUP_BY:
      return await groupByAutocomplete(innerText, callbacks, context);

    // KEY BY suggests multiple fields of string type
    case FusePosition.KEY_BY:
      return await keyByAutocomplete(innerText, fuseCommand, callbacks, context);

    // WITH suggests a map of options that depends on the <fuse_method>
    case FusePosition.WITH:
      return await withOptionAutocomplete(innerText, fuseCommand);
  }
}

/**
 * Returns suggestions for the `SCORE BY` argument of the `FUSE` command.
 * Returns fields of double type.
 */
async function scoreByAutocomplete(
  innerText: string,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
) {
  const numericFields = await callbacks?.getByType?.('double', [], {
    advanceCursor: true,
    openSuggestions: true,
  });

  const isFragmentComplete = (fragment: string) => columnExists(fragment, context);
  const getSuggestionsForIncomplete = (
    _fragment: string,
    rangeToReplace?: { start: number; end: number }
  ) => {
    return (
      numericFields?.map((suggestion) => {
        return {
          ...suggestion,
          rangeToReplace,
        };
      }) ?? []
    );
  };
  const getSuggestionsForComplete = () => [];

  return await handleFragment(
    innerText,
    isFragmentComplete,
    getSuggestionsForIncomplete,
    getSuggestionsForComplete
  );
}

/**
 *  Returns suggestions for the `GROUP BY` argument of the `FUSE` command.
 *  Returns fields of string type.
 */
async function groupByAutocomplete(
  innerText: string,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
) {
  const stringFields = await callbacks?.getByType?.(ESQL_STRING_TYPES, [], {
    advanceCursor: true,
    openSuggestions: true,
  });

  const isFragmentComplete = (fragment: string) => columnExists(fragment, context);
  const getSuggestionsForIncomplete = (
    _fragment: string,
    rangeToReplace?: { start: number; end: number }
  ) => {
    return (
      stringFields?.map((suggestion) => {
        return {
          ...suggestion,
          rangeToReplace,
        };
      }) ?? []
    );
  };
  const getSuggestionsForComplete = () => [];

  return await handleFragment(
    innerText,
    isFragmentComplete,
    getSuggestionsForIncomplete,
    getSuggestionsForComplete
  );
}

/**
 * Returns suggestions for the `KEY BY` argument of the `FUSE` command.
 * Returns fields of string type that are not already used in the `KEY BY` argument.
 * If there are already fields used, it also suggests a comma to add another field or
 *  other FUSE arguments configurations to scape from KEY BY.
 */
async function keyByAutocomplete(
  innerText: string,
  command: ESQLAstFuseCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
) {
  const keyByOption = findCommandOptionByName(command, 'key by');

  const alreadyUsedFields = keyByOption?.args.map((arg) => (isColumn(arg) ? arg.name : '')) ?? [];

  const allFields =
    (await callbacks?.getByType?.(ESQL_STRING_TYPES, alreadyUsedFields, {
      openSuggestions: true,
    })) ?? [];

  const isFragmentComplete = (fragment: string) => columnExists(fragment, context);
  const getSuggestionsForComplete = (
    fragment: string,
    rangeToReplace: { start: number; end: number }
  ) => {
    const finalSuggestions = fuseArgumentsAutocomplete(command).map((s) => ({
      ...s,
      text: ` ${s.text}`,
    }));
    if (allFields.length > 0) {
      finalSuggestions.push({ ...commaCompleteItem, text: ', ' });
    }

    return finalSuggestions.map<ISuggestionItem>((s) =>
      withAutoSuggest({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        rangeToReplace,
      })
    );
  };
  const getSuggestionsForIncomplete = (
    _fragment: string,
    rangeToReplace?: { start: number; end: number }
  ) => {
    return allFields.map((suggestion) =>
      withAutoSuggest({
        ...suggestion,
        rangeToReplace,
      })
    );
  };

  return handleFragment(
    innerText,
    isFragmentComplete,
    getSuggestionsForIncomplete,
    getSuggestionsForComplete
  );
}

/**
 * Returns suggestions for the `WITH` argument of the `FUSE` command.
 * The suggestions depend on the `<fuse_method>` used.
 * The default fuse method is `rrf`.
 * If `rrf`, it suggests `rank_constant` and `weights`.
 * If `linear` method is used, it suggests `normalizer` and `weights`.
 */
async function withOptionAutocomplete(innerText: string, command: ESQLAstFuseCommand) {
  const withOption = findCommandOptionByName(command, 'with');
  if (!withOption) {
    return [];
  }

  // Means the map is not present - FUSE WITH /
  if (withOption.args.length === 0) {
    return [
      withAutoSuggest({
        label: '{ }',
        kind: 'Reference',
        detail: '{ ... }',
        text: '{ $0 }',
        sortText: '0',
        asSnippet: true,
      }),
    ];
  }

  // Select map parameters based on fuseType; default to rrf if missing, if unknown keep the empty map and don't suggest nothing
  let mapParameters: MapParameters = {};
  if (!command.fuseType || command.fuseType.text === 'rrf') {
    mapParameters = {
      rank_constant: {
        type: 'number',
        suggestions: [
          {
            label: '60',
            text: '60',
            kind: 'Value',
            sortText: '1',
            detail: i18n.translate(
              'kbn-esql-language.esql.autocomplete.fuse.rank_constant_default',
              {
                defaultMessage: 'Default value',
              }
            ),
          },
        ],
      },
      weights: { type: 'map' },
    };
  } else if (command.fuseType.text === 'linear') {
    mapParameters = {
      normalizer: {
        type: 'string',
        suggestions: [noneValueCompleteItem, minMaxValueCompleteItem],
      },
      weights: { type: 'map' },
    };
  }

  return getCommandMapExpressionSuggestions(innerText, mapParameters);
}

/**
 * Returns suggestions for the arguments of the `FUSE` command.
 * Arguments can be placed at any order, except for the `<fuse_method>` which should be the first argument if present.
 * These arguments are: `<fuse_method>`, `SCORE BY`, `GROUP BY`, `KEY BY`, `WITH`.
 * It also suggests a pipe to chain another command after the `FUSE` command.
 */
function fuseArgumentsAutocomplete(command: ESQLAstFuseCommand): ISuggestionItem[] {
  const suggestions: ISuggestionItem[] = [pipeCompleteItem];

  const { scoreBy, keyBy, groupBy, withOption } = extractFuseArgs(command);

  if (command.args.length === 0) {
    suggestions.push(
      {
        label: 'linear',
        kind: 'Value',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.fuse.linear', {
          defaultMessage: 'Linear combination of scores',
        }),
        text: 'linear ',
        sortText: '0',
      },
      {
        label: 'rrf',
        kind: 'Value',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.fuse.rrf', {
          defaultMessage: 'Reciprocal rank fusion',
        }),
        text: 'rrf ',
        sortText: '0',
      }
    );
  }

  if (!scoreBy) {
    suggestions.push({
      label: 'SCORE BY',
      kind: 'Reference',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.fuse.scoreBy', {
        defaultMessage:
          'Defaults to _score. Designates which column to use to retrieve the relevance scores of the input',
      }),
      text: 'SCORE BY ',
      sortText: '1',
    });
  }

  if (!groupBy) {
    suggestions.push({
      label: 'GROUP BY',
      kind: 'Reference',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.fuse.groupBy', {
        defaultMessage: 'Defaults to _fork. Designates which column represents the result set',
      }),
      text: 'GROUP BY ',
      sortText: '2',
    });
  }

  if (!keyBy) {
    suggestions.push({
      label: 'KEY BY',
      kind: 'Reference',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.fuse.keyBy', {
        defaultMessage: 'Defaults to _id, _index. Rows with matching key_columns values are merged',
      }),
      text: 'KEY BY ',
      sortText: '3',
    });
  }

  if (!withOption) {
    suggestions.push({ ...withCompleteItem, sortText: '4' });
  }

  return suggestions.map((s) => withAutoSuggest(s));
}
