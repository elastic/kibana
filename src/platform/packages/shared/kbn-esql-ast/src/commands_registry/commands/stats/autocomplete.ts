/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { ICommandCallbacks, Location } from '../../types';
import type { ESQLCommand, ESQLCommandOption, ESQLColumn, ESQLFunction } from '../../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { getFunctionSuggestions } from '../../../definitions/utils/functions';
import {
  pipeCompleteItem,
  byCompleteItem,
  whereCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  getDateHistogramCompletionItem,
} from '../../utils/complete_items';
import {
  pushItUpInTheList,
  columnExists,
  handleFragment,
  getControlSuggestionIfSupported,
  suggestForExpression,
} from '../../../definitions/utils/autocomplete';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import { TRIGGER_SUGGESTION_COMMAND, ESQL_VARIABLES_PREFIX } from '../../constants';
import { getPosition, isMarkerNode } from './utils';

function alreadyUsedColumns(command: ESQLCommand) {
  const byOption = command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
    | ESQLCommandOption
    | undefined;

  const columnNodes = (byOption?.args.filter(
    (arg) => !Array.isArray(arg) && arg.type === 'column'
  ) ?? []) as ESQLColumn[];

  return columnNodes.map((node) => node.parts.join('.'));
}

function suggestColumns(
  columnSuggestions: ISuggestionItem[],
  otherSuggestions: ISuggestionItem[],
  innerText: string,
  context?: ICommandContext
) {
  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment, context),
    async (_fragment: string, rangeToReplace?: { start: number; end: number }) => {
      // fie<suggest>
      return [
        ...columnSuggestions.map((suggestion) => {
          return {
            ...suggestion,
            text: suggestion.text,
            rangeToReplace,
          };
        }),
        ...otherSuggestions,
      ];
    },
    (fragment: string, rangeToReplace: { start: number; end: number }) => {
      // field<suggest>
      const finalSuggestions = [
        { ...pipeCompleteItem, text: ' | ' },
        { ...commaCompleteItem, text: ', ' },
      ];
      return finalSuggestions.map<ISuggestionItem>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
        rangeToReplace,
      }));
    }
  );
}

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const pos = getPosition(query, command);

  const lastCharacterTyped = query[query.length - 1];
  const controlSuggestions = getControlSuggestionIfSupported(
    Boolean(context?.supportsControls),
    ESQLVariableType.FUNCTIONS,
    context?.variables,
    lastCharacterTyped !== ESQL_VARIABLES_PREFIX
  );

  switch (pos) {
    case 'expression_without_assignment':
      return [
        ...controlSuggestions,
        ...getFunctionSuggestions({ location: Location.STATS }),
        getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
      ];

    case 'expression_after_assignment':
      return [...controlSuggestions, ...getFunctionSuggestions({ location: Location.STATS })];

    case 'expression_complete':
      return [
        whereCompleteItem,
        byCompleteItem,
        pipeCompleteItem,
        { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND, text: ', ' },
      ];

    case 'after_where': {
      const whereFn = command.args[command.args.length - 1] as ESQLFunction;
      const expressionRoot = isMarkerNode(whereFn.args[1]) ? undefined : whereFn.args[1]!;

      if (expressionRoot && !!Array.isArray(expressionRoot)) {
        return [];
      }

      const suggestions = await suggestForExpression({
        innerText: query,
        getColumnsByType: callbacks?.getByType,
        expressionRoot,
        location: Location.STATS_WHERE,
        preferredExpressionType: 'boolean',
        context,
      });

      // Is this a complete boolean expression?
      // If so, we can call it done and suggest a pipe
      const expressionType = getExpressionType(
        expressionRoot,
        context?.fields,
        context?.userDefinedColumns
      );
      if (expressionType === 'boolean' && isExpressionComplete(expressionType, query)) {
        suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' }, byCompleteItem);
      }

      return suggestions;
    }

    case 'grouping_expression_after_assignment': {
      const histogramBarTarget = context?.histogramBarTarget ?? 0;

      const columnSuggestions = pushItUpInTheList(
        await callbacks?.getByType('any', [], { openSuggestions: true }),
        true
      );

      return suggestColumns(
        columnSuggestions,
        [
          ...getFunctionSuggestions({ location: Location.STATS_BY }),
          getDateHistogramCompletionItem(histogramBarTarget),
        ],
        query,
        context
      );
    }

    case 'grouping_expression_without_assignment': {
      const histogramBarTarget = context?.histogramBarTarget;

      const ignored = alreadyUsedColumns(command);

      const columnSuggestions = pushItUpInTheList(
        await callbacks.getByType('any', ignored, { openSuggestions: true }),
        true
      );

      const suggestions = await suggestColumns(
        columnSuggestions,
        [
          ...getFunctionSuggestions({ location: Location.STATS_BY }),
          getDateHistogramCompletionItem(histogramBarTarget),
        ],
        query,
        context
      );

      suggestions.push(
        getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
      );

      return suggestions;
    }

    case 'grouping_expression_complete':
      return [
        pipeCompleteItem,
        { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND, text: ', ' },
      ];

    default:
      return [];
  }
}
