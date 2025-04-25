/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRestartingExpression } from '../../../shared/helpers';
import { CommandSuggestParams, Location } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import {
  TRIGGER_SUGGESTION_COMMAND,
  getFunctionSuggestions,
  getNewUserDefinedColumnSuggestion,
} from '../../factories';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';

export async function suggest({
  getSuggestedUserDefinedColumnName,
  command,
  innerText,
}: CommandSuggestParams<'row'>): Promise<SuggestionRawDefinition[]> {
  // ROW col0 = /
  if (/=\s*$/.test(innerText)) {
    return getFunctionSuggestions({ location: Location.ROW });
  }

  // ROW col0 = 23 /
  else if (command.args.length > 0 && !isRestartingExpression(innerText)) {
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
