/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { MapParameters } from '../../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import {
  withAutoSuggest,
  commaCompleteItem,
  pipeCompleteItem,
  withCompleteItem,
  noneValueCompleteItem,
  minMaxValueCompleteItem,
} from '../../../..';
import { isColumn } from '../../../ast/is';
import { ESQL_STRING_TYPES } from '../../../definitions/types';
import { handleFragment, columnExists } from '../../../definitions/utils/autocomplete/helpers';
import type { ESQLAstFuseCommand } from '../../../types';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../../types';
import { extractFuseArgs, findCommandOptionByName } from './utils';

/**
 * Returns suggestions for the `SCORE BY` argument of the `FUSE` command.
 * Returns fields of double type.
 */
export async function scoreByAutocomplete(
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
export async function groupByAutocomplete(
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
export async function keyByAutocomplete(
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
export async function withOptionAutocomplete(
  innerText: string,
  command: ESQLAstFuseCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
) {
  const rrfParameters: MapParameters = {
    rank_constant: {
      type: 'number',
      suggestions: [],
    },
    weights: { type: 'map', suggestions: [] },
  };

  const linearParameters: MapParameters = {
    normalizer: {
      type: 'string',
      suggestions: [noneValueCompleteItem, minMaxValueCompleteItem],
    },
    weights: { type: 'map', suggestions: [] },
  };

  const mapParameters =
    !command.fuseType || command.fuseType.text === 'rrf' ? rrfParameters : linearParameters;

  return getCommandMapExpressionSuggestions(innerText, mapParameters);
}

/**
 * Returns suggestions for the arguments of the `FUSE` command.
 * Arguments can be placed at any order, except for the `<fuse_method>` which should be the first argument if present.
 * These arguments are: `<fuse_method>`, `SCORE BY`, `GROUP BY`, `KEY BY`, `WITH`.
 * It also suggests a pipe to chain another command after the `FUSE` command.
 */
export function fuseArgumentsAutocomplete(command: ESQLAstFuseCommand): ISuggestionItem[] {
  const suggestions: ISuggestionItem[] = [pipeCompleteItem];

  const { scoreBy, keyBy, groupBy, withOption } = extractFuseArgs(command);

  if (command.args.length === 0) {
    suggestions.push(
      {
        label: 'linear',
        kind: 'Value',
        detail: i18n.translate('kbn-esql-ast.esql.autocomplete.fuse.linear', {
          defaultMessage: 'Linear combination of scores',
        }),
        text: 'linear ',
        sortText: '0',
      },
      {
        label: 'rrf',
        kind: 'Value',
        detail: i18n.translate('kbn-esql-ast.esql.autocomplete.fuse.rrf', {
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
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.fuse.scoreBy', {
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
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.fuse.groupBy', {
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
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.fuse.keyBy', {
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
