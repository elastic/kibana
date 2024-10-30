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
  isOptionItem,
  noCaseCompare,
} from '../../../shared/helpers';
import { SuggestionRawDefinition } from '../../types';
import { TIME_SYSTEM_PARAMS, TRIGGER_SUGGESTION_COMMAND } from '../../factories';

/**
 * Position of the caret in the sort command:
*
* ```
* STATS [column1 =] expression1[, ..., [columnN =] expressionN] [BY grouping_expression1[, ..., grouping_expressionN]]
        |                      |                                     |                  |
        expression             expression_complete                  grouping_expression grouping_expression_complete

* ```
*/
export type CaretPosition =
  | 'expression'
  | 'expression_complete'
  | 'grouping_expression'
  | 'grouping_expression_complete';

export const getPosition = (innerText: string, command: ESQLCommand): CaretPosition => {
  if (
    command.args.some(
      (arg) => isOptionItem(arg) && arg.name === 'by' && arg.location.min < innerText.length
    )
  ) {
    if (
      getLastNonWhitespaceChar(innerText) === ',' ||
      noCaseCompare(findPreviousWord(innerText), 'by')
    ) {
      return 'grouping_expression';
    } else {
      return 'grouping_expression_complete';
    }
  }

  if (
    getLastNonWhitespaceChar(innerText) === ',' ||
    noCaseCompare(findPreviousWord(innerText), 'stats')
  ) {
    return 'expression';
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

export const getDateHistogramCompleteItem: () => SuggestionRawDefinition = () => ({
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.addDateHistogram', {
    defaultMessage: 'Add date histogram',
  }),
  // TODO preferences?.histogramBarTarget
  text: `BUCKET($0, ${1000}, ${TIME_SYSTEM_PARAMS.join(', ')})`,
  asSnippet: true,
  kind: 'Issue',
  detail: i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.addDateHistogramDetail',
    {
      defaultMessage: 'Add date histogram using bucket()',
    }
  ),
  sortText: '1A',
  command: TRIGGER_SUGGESTION_COMMAND,
});
