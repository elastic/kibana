/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '../../../types';
import { Location } from '../../types';
import {
  pipeCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
} from '../../utils/autocomplete/complete_items';
import {
  type ISuggestionItem,
  type GetColumnsByTypeFn,
  type ICommandContext,
  ESQLFieldWithMetadata,
} from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getFunctionSuggestions } from '../../../definitions/functions_helpers';
import { isRestartingExpression } from '../../../definitions/shared';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  getColumnsByType: GetColumnsByTypeFn,
  getSuggestedUserDefinedColumnName: (extraFieldNames?: string[] | undefined) => string,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  // ROW col0 = /
  if (/=\s*$/.test(query)) {
    return getFunctionSuggestions({ location: Location.ROW });
  }

  // ROW col0 = 23 /
  else if (command.args.length > 0 && !isRestartingExpression(query)) {
    return [
      { ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND },
      { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
    ];
  }

  // ROW /
  // ROW foo = "bar", /
  return [
    getNewUserDefinedColumnSuggestion(getSuggestedUserDefinedColumnName()),
    ...getFunctionSuggestions({ location: Location.ROW }),
  ];
}
