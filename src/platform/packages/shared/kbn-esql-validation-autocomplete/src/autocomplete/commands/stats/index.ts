/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { ESQLFunction } from '@kbn/esql-ast';
import { isSingleItem } from '../../../..';
import { CommandSuggestParams, Location } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import {
  TRIGGER_SUGGESTION_COMMAND,
  getNewVariableSuggestion,
  getFunctionSuggestions,
  getControlSuggestionIfSupported,
} from '../../factories';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { isExpressionComplete, pushItUpInTheList, suggestForExpression } from '../../helper';
import {
  byCompleteItem,
  getDateHistogramCompletionItem,
  getPosition,
  whereCompleteItem,
} from './util';
import { isMarkerNode } from '../../../shared/context';

export async function suggest({
  innerText,
  command,
  getColumnsByType,
  getSuggestedVariableName,
  getPreferences,
  getVariables,
  supportsControls,
  getExpressionType,
}: CommandSuggestParams<'stats'>): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  const columnSuggestions = pushItUpInTheList(
    await getColumnsByType('any', [], { advanceCursor: true, openSuggestions: true }),
    true
  );
  const controlSuggestions = getControlSuggestionIfSupported(
    Boolean(supportsControls),
    ESQLVariableType.FUNCTIONS,
    getVariables
  );

  switch (pos) {
    case 'expression_without_assignment':
      return [
        ...controlSuggestions,
        ...getFunctionSuggestions({ location: Location.STATS }),
        getNewVariableSuggestion(getSuggestedVariableName()),
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

    case 'after_where':
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

    case 'grouping_expression_after_assignment':
      return [
        ...getFunctionSuggestions({ location: Location.STATS_BY }),
        getDateHistogramCompletionItem((await getPreferences?.())?.histogramBarTarget),
        ...columnSuggestions,
      ];

    case 'grouping_expression_without_assignment':
      return [
        ...getFunctionSuggestions({ location: Location.STATS_BY }),
        getDateHistogramCompletionItem((await getPreferences?.())?.histogramBarTarget),
        ...columnSuggestions,
        getNewVariableSuggestion(getSuggestedVariableName()),
      ];

    case 'grouping_expression_complete':
      return [
        pipeCompleteItem,
        { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND, text: ', ' },
      ];

    default:
      return [];
  }
}
