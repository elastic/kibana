/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@kbn/esql-ast';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, allFunctions, getFunctionSuggestion } from '../../factories';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { pushItUpInTheList } from '../../helper';
import { byCompleteItem, getDateHistogramCompleteItem, getPosition } from './util';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'stats'>,
  getColumnsByType: GetColumnsByTypeFn,
  _columnExists: (column: string) => boolean
): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  switch (pos) {
    case 'expression':
      return allFunctions()
        .filter((func) => func.supportedCommands.includes('stats'))
        .map(getFunctionSuggestion);

    case 'expression_complete':
      return [
        byCompleteItem,
        pipeCompleteItem,
        { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND, text: ', ' },
      ];

    case 'grouping_expression':
      const columnSuggestions = pushItUpInTheList(
        await getColumnsByType('any', [], { advanceCursor: true, openSuggestions: true }),
        true
      );
      return [
        ...allFunctions()
          .filter((func) => func.supportedOptions?.includes('by'))
          .map(getFunctionSuggestion),
        getDateHistogramCompleteItem(),
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
