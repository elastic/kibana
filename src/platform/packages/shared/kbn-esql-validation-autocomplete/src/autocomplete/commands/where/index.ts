/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Walker,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLSingleAstItem,
  type ESQLFunction,
  ESQLAst,
} from '@kbn/esql-ast';
import { logicalOperators } from '../../../definitions/builtin';
import { isParameterType, type SupportedDataType } from '../../../definitions/types';
import { isFunctionItem } from '../../../shared/helpers';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import {
  getFunctionSuggestions,
  getOperatorSuggestion,
  getOperatorSuggestions,
  getSuggestionsAfterNot,
} from '../../factories';
import { getOverlapRange, getSuggestionsToRightOfOperatorExpression } from '../../helper';
import { getPosition } from './util';
import { pipeCompleteItem } from '../../complete_items';
import {
  UNSUPPORTED_COMMANDS_BEFORE_MATCH,
  UNSUPPORTED_COMMANDS_BEFORE_QSTR,
} from '../../../shared/constants';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'where'>,
  getColumnsByType: GetColumnsByTypeFn,
  _columnExists: (column: string) => boolean,
  _getSuggestedVariableName: () => string,
  getExpressionType: (expression: ESQLAstItem | undefined) => SupportedDataType | 'unknown',
  _getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>,
  fullTextAst?: ESQLAst
): Promise<SuggestionRawDefinition[]> {
  const suggestions: SuggestionRawDefinition[] = [];

  /**
   * The logic for WHERE suggestions is basically the logic for expression suggestions.
   * I assume we will eventually extract much of this to be a shared function among WHERE and EVAL
   * and anywhere else the user can enter a generic expression.
   */
  const expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;

  switch (getPosition(innerText, command)) {
    /**
     * After a column name
     */
    case 'after_column':
      const columnType = getExpressionType(expressionRoot);

      if (!isParameterType(columnType)) {
        break;
      }

      suggestions.push(
        ...getOperatorSuggestions({
          command: 'where',
          leftParamType: columnType,
          // no assignments allowed in WHERE
          ignored: ['='],
        })
      );
      break;

    /**
     * After a complete (non-operator) function call
     */
    case 'after_function':
      const returnType = getExpressionType(expressionRoot);

      if (!isParameterType(returnType)) {
        break;
      }

      suggestions.push(
        ...getOperatorSuggestions({
          command: 'where',
          leftParamType: returnType,
          ignored: ['='],
        })
      );

      break;

    /**
     * After a NOT keyword
     *
     * the NOT function is a special operator that can be used in different ways,
     * and not all these are mapped within the AST data structure: in particular
     * <COMMAND> <field> NOT <here>
     * is an incomplete statement and it results in a missing AST node, so we need to detect
     * from the query string itself
     *
     * (this comment was copied but seems to still apply)
     */
    case 'after_not':
      if (expressionRoot && isFunctionItem(expressionRoot) && expressionRoot.name === 'not') {
        suggestions.push(
          ...getFunctionSuggestions({ command: 'where', returnTypes: ['boolean'] }),
          ...(await getColumnsByType('boolean', [], { advanceCursor: true, openSuggestions: true }))
        );
      } else {
        suggestions.push(...getSuggestionsAfterNot());
      }

      break;

    /**
     * After an operator (e.g. AND, OR, IS NULL, +, etc.)
     */
    case 'after_operator':
      if (!expressionRoot) {
        break;
      }

      if (!isFunctionItem(expressionRoot) || expressionRoot.subtype === 'variadic-call') {
        // this is already guaranteed in the getPosition function, but TypeScript doesn't know
        break;
      }

      let rightmostOperator = expressionRoot;
      // get rightmost function
      const walker = new Walker({
        visitFunction: (fn: ESQLFunction) => {
          if (fn.location.min > rightmostOperator.location.min && fn.subtype !== 'variadic-call')
            rightmostOperator = fn;
        },
      });
      walker.walkFunction(expressionRoot);

      // See https://github.com/elastic/kibana/issues/199401 for an explanation of
      // why this check has to be so convoluted
      if (rightmostOperator.text.toLowerCase().trim().endsWith('null')) {
        suggestions.push(...logicalOperators.map(getOperatorSuggestion));
        break;
      }

      suggestions.push(
        ...(await getSuggestionsToRightOfOperatorExpression({
          queryText: innerText,
          commandName: 'where',
          rootOperator: rightmostOperator,
          preferredExpressionType: 'boolean',
          getExpressionType,
          getColumnsByType,
        }))
      );

      break;

    case 'empty_expression':
      // Don't suggest MATCH or QSTR after unsupported commands
      const priorCommands = fullTextAst?.map((a) => a.name) ?? [];
      const ignored = [];
      if (priorCommands.some((c) => UNSUPPORTED_COMMANDS_BEFORE_MATCH.has(c))) {
        ignored.push('match');
      }
      if (priorCommands.some((c) => UNSUPPORTED_COMMANDS_BEFORE_QSTR.has(c))) {
        ignored.push('qstr');
      }

      const columnSuggestions = await getColumnsByType('any', [], {
        advanceCursor: true,
        openSuggestions: true,
      });

      suggestions.push(
        ...columnSuggestions,
        ...getFunctionSuggestions({ command: 'where', ignored })
      );

      break;
  }

  // Is this a complete expression of the right type?
  // If so, we can call it done and suggest a pipe
  if (getExpressionType(expressionRoot) === 'boolean') {
    suggestions.push(pipeCompleteItem);
  }

  return suggestions.map<SuggestionRawDefinition>((s) => {
    const overlap = getOverlapRange(innerText, s.text);
    const offset = overlap.start === overlap.end ? 1 : 0;
    return {
      ...s,
      rangeToReplace: {
        start: overlap.start + offset,
        end: overlap.end + offset,
      },
    };
  });
}
