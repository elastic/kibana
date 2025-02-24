/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import {
  TRIGGER_SUGGESTION_COMMAND,
  getNewVariableSuggestion,
  getFunctionSuggestions,
  getControlSuggestionIfSupported,
} from '../../factories';
import { ESQLVariableType } from '../../../shared/types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { pushItUpInTheList } from '../../helper';
import { byCompleteItem, getDateHistogramCompletionItem, getPosition } from './util';

export async function suggest({
  innerText,
  command,
  getColumnsByType,
  getSuggestedVariableName,
  getPreferences,
  getVariablesByType,
  supportsControls,
}: CommandSuggestParams<'stats'>): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  const columnSuggestions = pushItUpInTheList(
    await getColumnsByType('any', [], { advanceCursor: true, openSuggestions: true }),
    true
  );
  const controlSuggestions = getControlSuggestionIfSupported(
    Boolean(supportsControls),
    ESQLVariableType.FUNCTIONS,
    getVariablesByType
  );

  switch (pos) {
    case 'expression_without_assignment':
      return [
        ...controlSuggestions,
        ...getFunctionSuggestions({ command: 'stats' }),
        getNewVariableSuggestion(getSuggestedVariableName()),
      ];

    case 'expression_after_assignment':
      return [...controlSuggestions, ...getFunctionSuggestions({ command: 'stats' })];

    case 'expression_complete':
      return [
        byCompleteItem,
        pipeCompleteItem,
        { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND, text: ', ' },
      ];

    case 'grouping_expression_after_assignment':
      return [
        ...getFunctionSuggestions({ command: 'stats', option: 'by' }),
        getDateHistogramCompletionItem((await getPreferences?.())?.histogramBarTarget),
        ...columnSuggestions,
      ];

    case 'grouping_expression_without_assignment':
      return [
        ...getFunctionSuggestions({ command: 'stats', option: 'by' }),
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
