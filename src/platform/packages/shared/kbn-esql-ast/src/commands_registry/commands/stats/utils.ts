/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAstItem, ESQLCommand, ESQLFunction, ESQLSingleAstItem } from '../../../types';
import { isColumn, isFunctionExpression, isIdentifier, isSource } from '../../../ast/helpers';
import { isOptionNode } from '../../../ast/util';
import { findPreviousWord, getLastNonWhitespaceChar } from '../../utils/autocomplete';
import { ISuggestionItem } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, EDITOR_MARKER } from '../../constants';
import { TIME_SYSTEM_PARAMS } from '../../../definitions/literats';

export function isMarkerNode(node: ESQLAstItem | undefined): boolean {
  if (Array.isArray(node)) {
    return false;
  }

  return Boolean(
    node &&
      (isColumn(node) || isIdentifier(node) || isSource(node)) &&
      node.name.endsWith(EDITOR_MARKER)
  );
}

function isNotMarkerNodeOrArray(arg: ESQLAstItem) {
  return Array.isArray(arg) || !isMarkerNode(arg);
}

function mapToNonMarkerNode(arg: ESQLAstItem): ESQLAstItem {
  return Array.isArray(arg) ? arg.filter(isNotMarkerNodeOrArray).map(mapToNonMarkerNode) : arg;
}

function isAssignment(arg: ESQLAstItem): arg is ESQLFunction {
  return isFunctionExpression(arg) && arg.name === '=';
}

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

export const getDateHistogramCompletionItem: (histogramBarTarget?: number) => ISuggestionItem = (
  histogramBarTarget: number = 50
) => ({
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.addDateHistogram', {
    defaultMessage: 'Add date histogram',
  }),
  text: `BUCKET($0, ${histogramBarTarget}, ${TIME_SYSTEM_PARAMS.join(', ')})`,
  asSnippet: true,
  kind: 'Issue',
  detail: i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.addDateHistogramDetail',
    {
      defaultMessage: 'Add date histogram using bucket()',
    }
  ),
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
});
