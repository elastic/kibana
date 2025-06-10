/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { ESQLColumn, ESQLCommand, ESQLCommandOption, ESQLFunction } from '@kbn/esql-ast';
import { isSingleItem } from '../../../..';
import { CommandSuggestParams, Location } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import {
  TRIGGER_SUGGESTION_COMMAND,
  getNewUserDefinedColumnSuggestion,
  getFunctionSuggestions,
  getControlSuggestionIfSupported,
} from '../../factories';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import {
  handleFragment,
  isExpressionComplete,
  pushItUpInTheList,
  suggestForExpression,
} from '../../helper';
import {
  byCompleteItem,
  getDateHistogramCompletionItem,
  getPosition,
  whereCompleteItem,
} from './util';
import { ESQL_VARIABLES_PREFIX } from '../../../shared/constants';
import { isMarkerNode } from '../../../shared/context';

export async function suggest({
  innerText,
  command,
  columnExists,
  getColumnsByType,
  getSuggestedUserDefinedColumnName,
  getPreferences,
  getVariables,
  supportsControls,
  getExpressionType,
}: CommandSuggestParams<'stats'>): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  const lastCharacterTyped = innerText[innerText.length - 1];
  const controlSuggestions = getControlSuggestionIfSupported(
    Boolean(supportsControls),
    ESQLVariableType.FUNCTIONS,
    getVariables,
    lastCharacterTyped !== ESQL_VARIABLES_PREFIX
  );

  switch (pos) {
    case 'expression_without_assignment':
      return [
        ...controlSuggestions,
        ...getFunctionSuggestions({ location: Location.STATS }),
        getNewUserDefinedColumnSuggestion(getSuggestedUserDefinedColumnName()),
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

      if (expressionRoot && !isSingleItem(expressionRoot)) {
        return [];
      }

      const suggestions = await suggestForExpression({
        expressionRoot,
        getExpressionType,
        getColumnsByType,
        location: Location.STATS_WHERE,
        innerText,
        preferredExpressionType: 'boolean',
      });

      // Is this a complete boolean expression?
      // If so, we can call it done and suggest a pipe
      const expressionType = getExpressionType(expressionRoot);
      if (expressionType === 'boolean' && isExpressionComplete(expressionType, innerText)) {
        suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' }, byCompleteItem);
      }

      return suggestions;
    }

    case 'grouping_expression_after_assignment': {
      const histogramBarTarget = (await getPreferences?.())?.histogramBarTarget;

      const columnSuggestions = pushItUpInTheList(
        await getColumnsByType('any', [], { openSuggestions: true }),
        true
      );

      return suggestColumns(
        columnSuggestions,
        [
          ...getFunctionSuggestions({ location: Location.STATS_BY }),
          getDateHistogramCompletionItem(histogramBarTarget),
        ],
        innerText,
        columnExists
      );
    }

    case 'grouping_expression_without_assignment': {
      const histogramBarTarget = (await getPreferences?.())?.histogramBarTarget;

      const ignored = alreadyUsedColumns(command);

      const columnSuggestions = pushItUpInTheList(
        await getColumnsByType('any', ignored, { openSuggestions: true }),
        true
      );

      const suggestions = await suggestColumns(
        columnSuggestions,
        [
          ...getFunctionSuggestions({ location: Location.STATS_BY }),
          getDateHistogramCompletionItem(histogramBarTarget),
        ],
        innerText,
        columnExists
      );

      suggestions.push(getNewUserDefinedColumnSuggestion(getSuggestedUserDefinedColumnName()));

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

function alreadyUsedColumns(command: ESQLCommand<'stats'>) {
  const byOption = command.args.find((arg) => isSingleItem(arg) && arg.name === 'by') as
    | ESQLCommandOption
    | undefined;

  const columnNodes = (byOption?.args.filter((arg) => isSingleItem(arg) && arg.type === 'column') ??
    []) as ESQLColumn[];

  return columnNodes.map((node) => node.parts.join('.'));
}

function suggestColumns(
  columnSuggestions: SuggestionRawDefinition[],
  otherSuggestions: SuggestionRawDefinition[],
  innerText: string,
  columnExists: (name: string) => boolean
) {
  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment),
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
      return finalSuggestions.map<SuggestionRawDefinition>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
        rangeToReplace,
      }));
    }
  );
}
