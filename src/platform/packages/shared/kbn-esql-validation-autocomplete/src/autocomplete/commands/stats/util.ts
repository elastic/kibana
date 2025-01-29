/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import {
  findPreviousWord,
  getLastNonWhitespaceChar,
  isAssignment,
  isAssignmentComplete,
  isOptionItem,
  noCaseCompare,
} from '../../../shared/helpers';
import { SuggestionRawDefinition } from '../../types';
import { TIME_SYSTEM_PARAMS, TRIGGER_SUGGESTION_COMMAND } from '../../factories';

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
  | 'grouping_expression_complete';

export const getPosition = (innerText: string, command: ESQLCommand): CaretPosition => {
  const lastCommandArg = command.args[command.args.length - 1];

  if (isOptionItem(lastCommandArg) && lastCommandArg.name === 'by') {
    // in the BY clause

    const lastOptionArg = lastCommandArg.args[lastCommandArg.args.length - 1];
    if (isAssignment(lastOptionArg) && !isAssignmentComplete(lastOptionArg)) {
      return 'grouping_expression_after_assignment';
    }

    if (
      getLastNonWhitespaceChar(innerText) === ',' ||
      noCaseCompare(findPreviousWord(innerText), 'by')
    ) {
      return 'grouping_expression_without_assignment';
    } else {
      return 'grouping_expression_complete';
    }
  }

  if (isAssignment(lastCommandArg) && !isAssignmentComplete(lastCommandArg)) {
    return 'expression_after_assignment';
  }

  if (
    getLastNonWhitespaceChar(innerText) === ',' ||
    noCaseCompare(findPreviousWord(innerText), 'stats')
  ) {
    return 'expression_without_assignment';
  } else {
    return 'expression_complete';
  }
};

export const byCompleteItem: SuggestionRawDefinition = {
  label: 'BY',
  text: 'BY ',
  kind: 'Reference',
  detail: 'By',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const getDateHistogramCompletionItem: (
  histogramBarTarget?: number
) => SuggestionRawDefinition = (histogramBarTarget: number = 50) => ({
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
