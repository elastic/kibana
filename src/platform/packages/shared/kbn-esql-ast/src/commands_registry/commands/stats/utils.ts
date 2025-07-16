/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstItem, ESQLCommand, ESQLFunction, ESQLSingleAstItem } from '../../../types';
import {
  isFunctionExpression,
  isFieldExpression,
  isWhereExpression,
  isParamLiteral,
  isOptionNode,
  isLiteral,
  isAssignment,
} from '../../../ast/is';
import { Walker } from '../../../walker';
import {
  findPreviousWord,
  getLastNonWhitespaceChar,
} from '../../../definitions/utils/autocomplete/helpers';
import { ISuggestionItem } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getFunctionDefinition } from '../../../definitions/utils/functions';
import { FunctionDefinitionTypes } from '../../../definitions/types';
import { mapToNonMarkerNode, isNotMarkerNodeOrArray } from '../../../definitions/utils/ast';

function isAssignmentComplete(node: ESQLFunction | undefined) {
  const assignExpression = removeMarkerArgFromArgsList(node)?.args?.[1];
  return Boolean(assignExpression && Array.isArray(assignExpression) && assignExpression.length);
}

const noCaseCompare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function removeMarkerArgFromArgsList<T extends ESQLSingleAstItem | ESQLCommand>(
  node: T | undefined
) {
  if (!node) {
    return;
  }
  if (node.type === 'command' || node.type === 'option' || node.type === 'function') {
    return {
      ...node,
      args: node.args.filter(isNotMarkerNodeOrArray).map(mapToNonMarkerNode),
    };
  }
  return node;
}

/**
 * Position of the caret in the sort command:
*
* ```
* STATS [column1 =] expression1[, ..., [columnN =] expressionN] [BY [column1 =] grouping_expression1[, ..., grouping_expressionN]]
        |           |          |                                    |           |                   |
        |           |          expression_complete                  |           |                   grouping_expression_complete
        |           expression_after_assignment                     |           grouping_expression_after_assignment
        expression_without_assignment                               grouping_expression_without_assignment

* ```
*/
export type CaretPosition =
  | 'expression_without_assignment'
  | 'expression_after_assignment'
  | 'expression_complete'
  | 'grouping_expression_without_assignment'
  | 'grouping_expression_after_assignment'
  | 'grouping_expression_complete'
  | 'after_where';

export const getPosition = (innerText: string, command: ESQLCommand): CaretPosition => {
  const lastCommandArg = command.args[command.args.length - 1];

  if (isOptionNode(lastCommandArg) && lastCommandArg.name === 'by') {
    // in the BY clause

    const lastOptionArg = lastCommandArg.args[lastCommandArg.args.length - 1];
    if (isAssignment(lastOptionArg) && !isAssignmentComplete(lastOptionArg)) {
      return 'grouping_expression_after_assignment';
    }

    // check if the cursor follows a comma or the BY keyword
    // optionally followed by a fragment of a word
    // e.g. ", field/"
    if (/\,\s+\S*$/.test(innerText) || noCaseCompare(findPreviousWord(innerText), 'by')) {
      return 'grouping_expression_without_assignment';
    } else {
      return 'grouping_expression_complete';
    }
  }

  if (isAssignment(lastCommandArg) && !isAssignmentComplete(lastCommandArg)) {
    return 'expression_after_assignment';
  }

  if (getLastNonWhitespaceChar(innerText) === ',' || /stats\s+\S*$/i.test(innerText)) {
    return 'expression_without_assignment';
  }

  if (isFunctionExpression(lastCommandArg) && lastCommandArg.name === 'where') {
    return 'after_where';
  }

  return 'expression_complete';
};

export const byCompleteItem: ISuggestionItem = {
  label: 'BY',
  text: 'BY ',
  kind: 'Reference',
  detail: 'By',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const whereCompleteItem: ISuggestionItem = {
  label: 'WHERE',
  text: 'WHERE ',
  kind: 'Reference',
  detail: 'Where',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

function isAggregation(arg: ESQLAstItem): arg is ESQLFunction {
  return (
    isFunctionExpression(arg) &&
    getFunctionDefinition(arg.name)?.type === FunctionDefinitionTypes.AGG
  );
}

function isNotAnAggregation(arg: ESQLAstItem): arg is ESQLFunction {
  return (
    isFunctionExpression(arg) &&
    getFunctionDefinition(arg.name)?.type !== FunctionDefinitionTypes.AGG
  );
}

const isFunctionOperatorParam = (fn: ESQLFunction): boolean =>
  !!fn.operator && isParamLiteral(fn.operator);

export function checkAggExistence(arg: ESQLFunction): boolean {
  if (isWhereExpression(arg)) {
    return checkAggExistence(arg.args[0] as ESQLFunction);
  }

  if (isFieldExpression(arg)) {
    const agg = arg.args[1];
    const firstFunction = Walker.match(agg, { type: 'function' });

    if (!firstFunction) {
      return false;
    }

    return checkAggExistence(firstFunction as ESQLFunction);
  }

  // TODO the grouping function check may not
  // hold true for all future cases
  if (isAggregation(arg) || isFunctionOperatorParam(arg)) {
    return true;
  }

  if (isNotAnAggregation(arg)) {
    return (arg as ESQLFunction).args.filter(isFunctionExpression).some(checkAggExistence);
  }

  return false;
}

// now check that:
// * the agg function is at root level
// * or if it's a operators function, then all operands are agg functions or literals
// * or if it's a eval function then all arguments are agg functions or literals
// * or if a named param is used
export function checkFunctionContent(arg: ESQLFunction) {
  // TODO the grouping function check may not
  // hold true for all future cases
  if (isAggregation(arg) || isFunctionOperatorParam(arg)) {
    return true;
  }
  return (arg as ESQLFunction).args.every((subArg): boolean => {
    // Differentiate between array and non-array arguments
    if (Array.isArray(subArg)) {
      return subArg.every((item) => checkFunctionContent(item as ESQLFunction));
    }
    return (
      isLiteral(subArg) ||
      isAggregation(subArg) ||
      (isNotAnAggregation(subArg) ? checkFunctionContent(subArg) : false)
    );
  });
}
