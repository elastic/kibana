/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import {
  findPreviousWord,
  getLastNonWhitespaceChar,
  isOptionItem,
  noCaseCompare,
} from '../../../shared/helpers';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import {
  TIME_SYSTEM_PARAMS,
  TRIGGER_SUGGESTION_COMMAND,
  allFunctions,
  getFunctionSuggestion,
} from '../../factories';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { pushItUpInTheList } from '../../helper';

// STATS <expression>

/**
 * Position of the caret in the sort command:
*
* ```
* STATS [column1 =] expression1[, ..., [columnN =] expressionN] [BY grouping_expression1[, ..., grouping_expressionN]]
        |                      |                                     |
        expression_start       expression_complete                   grouping_expression_start

* ```
*/
export type CaretPosition =
  | 'expression_start'
  | 'expression_complete'
  | 'grouping_expression_start'
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
      return 'grouping_expression_start';
    } else {
      return 'grouping_expression_complete';
    }
  }

  if (
    getLastNonWhitespaceChar(innerText) === ',' ||
    noCaseCompare(findPreviousWord(innerText), 'stats')
  ) {
    return 'expression_start';
  } else {
    return 'expression_complete';
  }
};

const byCompleteItem: SuggestionRawDefinition = {
  label: 'BY',
  text: 'BY ',
  kind: 'Reference',
  detail: 'By',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

const dateHistogramCompleteItem: SuggestionRawDefinition = {
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
};

export async function suggest(
  innerText: string,
  command: ESQLCommand<'stats'>,
  getColumnsByType: GetColumnsByTypeFn,
  _columnExists: (column: string) => boolean
): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);
  switch (pos) {
    case 'expression_start':
      return allFunctions()
        .filter((func) => func.supportedCommands.includes('stats'))
        .map(getFunctionSuggestion);

    case 'expression_complete':
      return [
        byCompleteItem,
        pipeCompleteItem,
        { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND, text: ', ' },
      ];

    case 'grouping_expression_start':
      const columnSuggestions = pushItUpInTheList(await getColumnsByType('any'), true);
      return [
        ...allFunctions()
          .filter((func) => func.supportedOptions?.includes('by'))
          .map(getFunctionSuggestion),
        dateHistogramCompleteItem,
        ...columnSuggestions,
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
